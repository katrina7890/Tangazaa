<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\BookingSource;
use App\Enums\PipelineStage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\UpdateBookingStageRequest;
use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\BookingStage;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * The 7-stage operational pipeline of a booking (confirmed → artwork →
 * printing → installation scheduled → installed → campaign active → vendor
 * payment released), package-tracking style. Stored rows exist only for
 * stages that have been touched; the endpoint composes the full ladder.
 */
class BookingPipelineController extends Controller
{
    public function show(Request $request, Booking $booking): JsonResponse
    {
        Gate::authorize('viewAny', [BookingStage::class, $booking]);

        return response()->json([
            'stages' => $this->composePipeline($booking),
            // For the assignee picker — every account in this workspace.
            'team' => $this->teamMembers($request->user()->partnerOwnerId()),
        ]);
    }

    public function update(UpdateBookingStageRequest $request, Booking $booking, string $stage): JsonResponse
    {
        Gate::authorize('update', [BookingStage::class, $booking]);

        $pipelineStage = PipelineStage::tryFrom($stage);
        if (! $pipelineStage) {
            throw ValidationException::withMessages(['stage' => 'Unknown pipeline stage.']);
        }
        if ($pipelineStage === PipelineStage::PaymentReleased && $booking->source === BookingSource::Offline) {
            throw ValidationException::withMessages(['stage' => 'Offline deals have no Tangazaa payout to release.']);
        }
        if ($request->filled('substatus') && ! in_array($request->string('substatus')->toString(), $pipelineStage->substatuses(), true)) {
            throw ValidationException::withMessages(['substatus' => 'Not a valid sub-status for this stage.']);
        }

        /** @var BookingStage $record */
        $record = $booking->stages()->firstOrCreate(['stage' => $pipelineStage->value]);

        $newPhotos = collect($request->file('photos', []))
            ->map(fn (UploadedFile $photo) => $photo->store('booking-stages', 'public'))
            ->all();

        $record->fill([
            'substatus' => $request->has('substatus') ? $request->input('substatus') : $record->substatus,
            'note' => $request->has('note') ? $request->input('note') : $record->note,
            'assigned_to' => $request->has('assigned_to') ? $request->input('assigned_to') : $record->assigned_to,
            'photos' => array_merge($record->photos ?? [], $newPhotos) ?: null,
        ]);

        if ($request->has('completed')) {
            if ($request->boolean('completed')) {
                $record->completed_at ??= now();
                $this->cascadeCompletion($booking, $pipelineStage);
                $this->notifyClient($booking, $pipelineStage);
            } else {
                // Reopening a stage reopens everything after it too.
                $record->completed_at = null;
                $booking->stages()
                    ->whereIn('stage', $this->stagesAfter($pipelineStage))
                    ->update(['completed_at' => null]);
            }
        }

        $record->save();

        return response()->json(['stages' => $this->composePipeline($booking->refresh())]);
    }

    /** Completing a stage implies everything before it is done (package-tracking style). */
    private function cascadeCompletion(Booking $booking, PipelineStage $stage): void
    {
        foreach (PipelineStage::cases() as $earlier) {
            if ($earlier->order() >= $stage->order()) {
                break;
            }
            $record = $booking->stages()->firstOrCreate(['stage' => $earlier->value]);
            if (! $record->completed_at) {
                $record->update(['completed_at' => now()]);
            }
        }
    }

    /** @return array<int, string> */
    private function stagesAfter(PipelineStage $stage): array
    {
        return collect(PipelineStage::cases())
            ->filter(fn (PipelineStage $candidate) => $candidate->order() > $stage->order())
            ->map(fn (PipelineStage $candidate) => $candidate->value)
            ->values()
            ->all();
    }

    /**
     * Tell the client their campaign moved forward. In-app today; the same
     * hook is where email/SMS go when a provider is wired up.
     */
    private function notifyClient(Booking $booking, PipelineStage $stage): void
    {
        if (! $booking->customer_id) {
            return; // offline deals have no app customer
        }

        AppNotification::notify(
            $booking->customer_id,
            'booking.stage',
            $stage->label().' — '.$booking->billboard->title,
            'Your campaign has moved forward: '.strtolower($stage->label()).'.',
        );
    }

    /** @return array<int, array<string, mixed>> */
    private function composePipeline(Booking $booking): array
    {
        $records = $booking->stages()->with('assignee')->get()->keyBy(fn (BookingStage $row) => $row->stage->value);
        $isOffline = $booking->source === BookingSource::Offline;

        return collect(PipelineStage::cases())
            ->map(function (PipelineStage $stage) use ($records, $booking, $isOffline) {
                /** @var BookingStage|null $record */
                $record = $records->get($stage->value);

                // "Booking confirmed" completes itself the moment the booking is
                // confirmed — no one should have to click it.
                $completedAt = $record?->completed_at;
                if (! $completedAt && $stage === PipelineStage::Confirmed && $booking->status->value === 'confirmed') {
                    $completedAt = $booking->created_at;
                }

                return [
                    'stage' => $stage->value,
                    'label' => $stage->label(),
                    'applicable' => ! ($stage === PipelineStage::PaymentReleased && $isOffline),
                    'substatuses' => $stage->substatuses(),
                    'substatus' => $record?->substatus,
                    'note' => $record?->note,
                    'photos' => collect($record?->photos ?? [])
                        ->map(fn (string $path) => Storage::disk('public')->url($path))
                        ->all(),
                    'assigned_to' => $record?->assignee ? [
                        'id' => $record->assignee->id,
                        'name' => $record->assignee->name,
                    ] : null,
                    'completed_at' => $completedAt?->toIso8601String(),
                ];
            })
            ->all();
    }

    /** @return array<int, array<string, mixed>> */
    private function teamMembers(int $ownerId): array
    {
        return User::query()
            ->where('id', $ownerId)
            ->orWhere('employer_id', $ownerId)
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (User $member) => ['id' => $member->id, 'name' => $member->name])
            ->all();
    }
}
