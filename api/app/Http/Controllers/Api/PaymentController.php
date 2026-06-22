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
