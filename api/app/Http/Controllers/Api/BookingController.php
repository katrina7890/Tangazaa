<?php

namespace App\Http\Controllers\Api;

use App\Actions\Booking\CreateBooking;
use App\Enums\BookingStatus;
use App\Enums\ClientReaction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\ReactToBookingUpdateRequest;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Http\Resources\BookingUpdateResource;
use App\Http\Resources\PaymentResource;
use App\Models\AppNotification;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\BookingUpdate;
use App\Services\Payments\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

class BookingController extends Controller
{
    public function store(StoreBookingRequest $request, CreateBooking $createBooking, PaystackService $paystack): JsonResponse
    {
        $billboard = Billboard::findOrFail($request->integer('billboard_id'));

        $booking = $createBooking->handle(
            $request->user(),
            $billboard,
            $request->string('start_date')->toString(),
            $request->string('end_date')->toString(),
        );

        // Open a checkout immediately so the SPA can hand the customer straight
        // to the (simulated) Paystack payment step.
        $payment = $paystack->initialize($booking, $request->user()->email);

        return (new BookingResource($booking->load('billboard')))
            ->additional(['payment' => new PaymentResource($payment)])
            ->response()
            ->setStatusCode(201);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $bookings = $request->user()->bookings()
            ->with(['billboard', 'latestPayment', 'latestUpdate'])
            ->withCount([
                'updates',
                // Approval requests the customer hasn't answered yet — powers
                // the "action needed" nudge on the dashboard card.
                'updates as pending_approvals_count' => fn ($query) => $query
                    ->where('requires_approval', true)
                    ->whereNull('client_reaction'),
            ])
            ->latest()
            ->get();

        return BookingResource::collection($bookings);
    }

    /**
     * The Glovo-style progress timeline for one of the customer's bookings —
     * every update the billboard company has posted, oldest first.
     */
    public function updates(Request $request, Booking $booking): AnonymousResourceCollection
    {
        abort_unless($booking->customer_id === $request->user()->id, 403);

        return BookingUpdateResource::collection(
            $booking->updates()->with('author')->oldest()->get(),
        );
    }

    /**
     * The customer answers an update: approve a go-ahead request, like the
     * progress, or ask the company for changes.
     */
    public function reactToUpdate(ReactToBookingUpdateRequest $request, BookingUpdate $update): BookingUpdateResource
    {
        abort_unless($update->booking->customer_id === $request->user()->id, 403);

        $reaction = ClientReaction::from($request->validated('reaction'));

        // `approved` only answers an explicit go-ahead question; an approval
        // request in turn needs a real answer, not just a thumbs-up.
        if ($reaction === ClientReaction::Approved && ! $update->requires_approval) {
            throw ValidationException::withMessages(['reaction' => 'This update did not ask for your approval.']);
        }
        if ($reaction === ClientReaction::Liked && $update->requires_approval) {
            throw ValidationException::withMessages(['reaction' => 'Please approve or request changes on this update.']);
        }

        $update->update([
            'client_reaction' => $reaction,
            'client_comment' => $request->validated('comment'),
        ]);

        AppNotification::notify(
            $update->booking->billboard->owner_id,
            'campaign.reaction',
            sprintf('%s %s on %s', $request->user()->name, match ($reaction) {
                ClientReaction::Approved => 'approved the go-ahead',
                ClientReaction::Liked => 'liked your update',
                ClientReaction::ChangesRequested => 'requested changes',
            }, $update->booking->billboard->title),
            $request->validated('comment'),
        );

        return new BookingUpdateResource($update->load('author'));
    }

    public function cancel(Request $request, Booking $booking): BookingResource
    {
        // Customers may only cancel their own bookings.
        abort_unless($booking->customer_id === $request->user()->id, 403);

        abort_if(
            $booking->status === BookingStatus::Cancelled,
            422,
            'This booking has already been cancelled.',
        );

        $booking->update(['status' => BookingStatus::Cancelled]);

        return new BookingResource($booking->load('billboard'));
    }
}
