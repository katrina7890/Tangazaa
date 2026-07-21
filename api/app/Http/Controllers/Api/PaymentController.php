<?php

namespace App\Http\Controllers\Api;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Http\Resources\PaymentResource;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\Payments\PaystackService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    /**
     * Every payment attempt the customer has made, newest first — the billing
     * history behind the dashboard's Payments section. Unlike the `payment`
     * field on a booking (which is only the latest attempt), this includes
     * failed and superseded transactions.
     */
    public function mine(Request $request): JsonResponse
    {
        $payments = Payment::query()
            ->whereHas('booking', fn ($query) => $query->where('customer_id', $request->user()->id))
            ->with('booking.billboard')
            ->latest()
            ->get();

        return response()->json([
            'data' => $payments->map(fn (Payment $payment) => [
                'id' => $payment->id,
                'reference' => $payment->reference,
                'amount' => $payment->amount,
                'channel' => $payment->channel,
                'status' => $payment->status->value,
                'paidAt' => $payment->paid_at?->toIso8601String(),
                'createdAt' => $payment->created_at->toIso8601String(),
                'bookingId' => $payment->booking_id,
                'billboard' => $payment->booking->billboard->title,
                'bookingStatus' => $payment->booking->status->value,
            ])->values(),
        ]);
    }

    /**
     * Start (or resume) checkout for a pending booking — used by "Complete
     * payment" on a booking the customer didn't finish paying for.
     */
    public function initialize(Request $request, Booking $booking, PaystackService $paystack): PaymentResource
    {
        abort_unless($booking->customer_id === $request->user()->id, 403);
        abort_if($booking->status !== BookingStatus::Pending, 422, 'This booking is not awaiting payment.');

        return new PaymentResource($paystack->initialize($booking, $request->user()->email));
    }

    /**
     * Settle a checkout. The SPA posts `success: false` to simulate a decline.
     */
    public function verify(Request $request, string $reference, PaystackService $paystack): JsonResponse
    {
        $payment = Payment::where('reference', $reference)->firstOrFail();

        abort_unless($payment->booking->customer_id === $request->user()->id, 403);

        $payment = $paystack->verify($payment, $request->boolean('success', true));

        return (new BookingResource($payment->booking->load('billboard')))
            ->additional(['payment' => new PaymentResource($payment)])
            ->response();
    }
}
