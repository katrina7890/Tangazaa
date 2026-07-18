<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\CampaignStage;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\StoreBookingUpdateRequest;
use App\Http\Resources\BookingUpdateResource;
use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\BookingUpdate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

/**
 * The company side of the campaign progress tracker: post Glovo-style stage
 * updates (agent contact → artwork → production → installation) on a booking,
 * optionally with site photos and an "approve to proceed?" question.
 */
class BookingUpdateController extends Controller
{
    public function index(Request $request, Booking $booking): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', [BookingUpdate::class, $booking]);

        return BookingUpdateResource::collection(
            $booking->updates()->with('author')->oldest()->get(),
        );
    }

    public function store(StoreBookingUpdateRequest $request, Booking $booking): JsonResponse
    {
        Gate::authorize('create', [BookingUpdate::class, $booking]);

        $photoPaths = collect($request->file('photos', []))
            ->map(fn (UploadedFile $photo) => $photo->store('booking-updates', 'public'))
            ->all();

        $update = $booking->updates()->create([
            'user_id' => $request->user()->id,
            'stage' => $request->enum('stage', CampaignStage::class),
            'message' => $request->input('message'),
            'photos' => $photoPaths ?: null,
            'requires_approval' => $request->boolean('requires_approval'),
        ]);

        // Offline bookings have no app customer to notify.
        if ($booking->customer_id) {
            AppNotification::notify(
                $booking->customer_id,
                'campaign.update',
                $update->requires_approval
                    ? 'Your go-ahead is needed on '.$booking->billboard->title
                    : 'Campaign update: '.$booking->billboard->title,
                $update->message,
            );
        }

        return (new BookingUpdateResource($update->load('author')))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Request $request, BookingUpdate $update): Response
    {
        Gate::authorize('delete', $update);

        foreach ($update->photos ?? [] as $path) {
            Storage::disk('public')->delete($path);
        }

        $update->delete();

        return response()->noContent();
    }
}
