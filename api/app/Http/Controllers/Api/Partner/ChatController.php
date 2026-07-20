<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMessageResource;
use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\BookingStage;
use App\Models\ChatMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;

/**
 * Chat Centre (ERP PRD §5): one conversation per booking, app and offline
 * side by side. App-booking threads reach the customer's Tangazaa account;
 * offline threads double as the team's comms log.
 */
class ChatController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $conversations = Booking::query()
            ->whereIn('billboard_id', $request->user()->partnerOwner()->billboards()->select('id'))
            ->where('status', '!=', 'cancelled')
            ->with(['billboard', 'customer', 'contact', 'messages' => fn ($query) => $query->latest()->limit(1)])
            ->withCount('messages')
            ->latest('start_date')
            ->get()
            ->map(function (Booking $booking) {
                /** @var ChatMessage|null $latest */
                $latest = $booking->messages->first();

                return [
                    'booking_id' => $booking->id,
                    'billboard' => $booking->billboard->title,
                    'advertiser' => $booking->customer?->company_name
                        ?? $booking->customer?->name
                        ?? $booking->contact?->company
                        ?? $booking->contact?->name,
                    'source' => $booking->source?->value ?? 'app',
                    'messages_count' => $booking->messages_count,
                    'latest' => $latest ? [
                        'body' => $latest->body ?? '📷 Photo',
                        'from_customer' => $latest->fromCustomer(),
                        'at' => $latest->created_at->toIso8601String(),
                    ] : null,
                ];
            })
            // Threads with recent traffic first, quiet bookings after.
            ->sortByDesc(fn (array $row) => $row['latest']['at'] ?? '')
            ->values();

        return response()->json(['data' => $conversations]);
    }

    public function show(Request $request, Booking $booking): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [BookingStage::class, $booking]);

        return ChatMessageResource::collection(
            $booking->messages()->with(['sender', 'booking'])->oldest()->get(),
        );
    }

    public function store(Request $request, Booking $booking): JsonResponse
    {
        Gate::authorize('update', [BookingStage::class, $booking]);

        $request->validate([
            'body' => ['nullable', 'string', 'max:3000', 'required_without:attachments'],
            'attachments' => ['nullable', 'array', 'max:4'],
            'attachments.*' => ['image', 'max:4096'],
        ]);

        $message = $booking->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $request->input('body'),
            'attachments' => collect($request->file('attachments', []))
                ->map(fn (UploadedFile $file) => $file->store('chat', 'public'))
                ->all() ?: null,
        ]);

        if ($booking->customer_id) {
            AppNotification::notify(
                $booking->customer_id,
                'chat.message',
                'New message — '.$booking->billboard->title,
                $message->body,
            );
        }

        return (new ChatMessageResource($message->load(['sender', 'booking'])))
            ->response()
            ->setStatusCode(201);
    }
}
