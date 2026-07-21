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
use App\Http\Resources\ChatMessageResource;
use App\Http\Resources\PaymentResource;
use App\Models\AppNotification;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\BookingUpdate;
use App\Services\Mail\CustomerMailer;
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
            ->with(['billboard', 'latestPayment', 'latestUpdate', 'accountManager'])
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

    /** The customer's chat inbox: one conversation per booking. */
    public function chats(Request $request): JsonResponse
    {
        $conversations = $request->user()->bookings()
            ->where('status', '!=', 'cancelled')
            ->with(['billboard.owner', 'messages' => fn ($query) => $query->latest()->limit(1)])
            ->latest('start_date')
            ->get()
            ->map(function (Booking $booking) {
                $latest = $booking->messages->first();

                return [
                    'booking_id' => $booking->id,
                    'billboard' => $booking->billboard->title,
                    'company' => $booking->billboard->owner->company_name ?? $booking->billboard->owner->name,
                    'latest' => $latest ? [
                        'body' => $latest->body ?? '📷 Photo',
                        'from_customer' => $latest->fromCustomer(),
                        'at' => $latest->created_at->toIso8601String(),
                    ] : null,
                ];
            })
            ->sortByDesc(fn (array $row) => $row['latest']['at'] ?? '')
            ->values();

        return response()->json(['data' => $conversations]);
    }

    /** Chat thread with the billboard company (customer side). */
    public function messages(Request $request, Booking $booking): AnonymousResourceCollection
    {
        abort_unless($booking->customer_id === $request->user()->id, 403);

        return ChatMessageResource::collection(
            $booking->messages()->with(['sender', 'booking'])->oldest()->get(),
        );
    }

    public function sendMessage(Request $request, Booking $booking): JsonResponse
    {
        abort_unless($booking->customer_id === $request->user()->id, 403);

        $request->validate([
            'body' => ['nullable', 'string', 'max:3000', 'required_without:attachments'],
            'attachments' => ['nullable', 'array', 'max:4'],
            'attachments.*' => ['image', 'max:4096'],
        ]);

        $message = $booking->messages()->create([
            'sender_id' => $request->user()->id,
            'body' => $request->input('body'),
            'attachments' => collect($request->file('attachments', []))
                ->map(fn ($file) => $file->store('chat', 'public'))
                ->all() ?: null,
        ]);

        AppNotification::notify(
            $booking->billboard->owner_id,
            'chat.message',
            'New message from '.($request->user()->company_name ?? $request->user()->name),
            $message->body,
        );

        return (new ChatMessageResource($message->load(['sender', 'booking'])))
            ->response()
            ->setStatusCode(201);
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

        app(CustomerMailer::class)->bookingCancelled($booking, byCustomer: true);

        return new BookingResource($booking->load('billboard'));
    }
}
