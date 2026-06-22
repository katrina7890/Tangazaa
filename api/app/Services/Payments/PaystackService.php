<?php

namespace App\Services\Payments;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Simulated Paystack gateway.
 *
 * A real integration would hit Paystack's HTTP API: `initialize()` would call
 * POST /transaction/initialize and hand back an `authorization_url`, and
 * `verify()` would call GET /transaction/verify/{reference}. Here we keep the
 * same shape but resolve everything locally so the demo needs no API keys —
 * the SPA renders its own Paystack-styled checkout against these methods.
 */
class PaystackService
{
    /**
     * Start (or resume) a checkout for a booking. Reuses an open pending payment
     * so repeated "Pay now" clicks don't create duplicate transactions.
     */
    public function initialize(Booking $booking, string $email): Payment
    {
        $pending = $booking->payments()
            ->where('status', PaymentStatus::Pending)
            ->latest()
            ->first();

        if ($pending) {
            return $pending;
        }

        return $booking->payments()->create([
            'reference' => $this->generateReference(),
            'amount' => $booking->total_price,
            'email' => $email,
            'channel' => 'card',
            'status' => PaymentStatus::Pending,
        ]);
    }

    /**
     * Settle a checkout. `$success` lets the demo exercise the declined path too.
     * Confirming re-checks availability, since the dates aren't held while a
     * payment is merely pending.
     */
    public function verify(Payment $payment, bool $success = true): Payment
    {
        // Idempotent: verifying an already-settled payment is a no-op.
        if ($payment->status !== PaymentStatus::Pending) {
            return $payment;
        }

        if (! $success) {
            $payment->update(['status' => PaymentStatus::Failed]);

            return $payment;
        }

        $booking = $payment->booking;

        $overlaps = $booking->billboard->bookings()
            ->whereKeyNot($booking->id)
            ->where('status', BookingStatus::Confirmed)
            ->where('start_date', '<=', $booking->end_date)
            ->where('end_date', '>=', $booking->start_date)
            ->exists();

        if ($overlaps) {
            $payment->update(['status' => PaymentStatus::Failed]);
            $booking->update(['status' => BookingStatus::Cancelled]);

            throw ValidationException::withMessages([
                'reference' => ['Those dates were just booked by someone else — your card was not charged.'],
            ]);
        }

        $payment->update([
            'status' => PaymentStatus::Success,
            'paid_at' => now(),
        ]);
        $booking->update(['status' => BookingStatus::Confirmed]);

        return $payment;
    }

    private function generateReference(): string
    {
        return 'TGZ-'.strtoupper(Str::random(12));
    }
}
