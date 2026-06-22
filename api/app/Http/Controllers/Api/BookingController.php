<?php

namespace App\Http\Controllers\Api;

use App\Actions\Booking\CreateBooking;
use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Http\Resources\PaymentResource;
use App\Models\Billboard;
use App\Models\Booking;
use App\Services\Payments\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

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
        $bookings = $request->user()->bookings()->with(['billboard', 'latestPayment'])->latest()->get();

        return BookingResource::collection($bookings);
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
