<?php

namespace App\Services\Payments;

use App\Enums\BookingStatus;
use App\Enums\PaymentChannel;
use App\Enums\PaymentStatus;
use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\Mail\CustomerMailer;
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
    public function initialize(Booking $booking, string $email, PaymentChannel $channel = PaymentChannel::Card): Payment
    {
        $pending = $booking->payments()
            ->where('status', PaymentStatus::Pending)
            ->latest()
            ->first();

        if ($pending) {
            // Resuming an unfinished checkout: honour a change of mind about
            // how to pay, without opening a second transaction.
            if ($pending->channel !== $channel->value) {
                $pending->update(['channel' => $channel->value]);
            }

            return $pending;
        }

        return $booking->payments()->create([
            'reference' => $this->generateReference(),
            'amount' => $booking->total_price,
            'email' => $email,
            'channel' => $channel->value,
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

        AppNotification::notify(
            $booking->billboard->owner_id,
            'booking.paid',
            "Booking paid — {$booking->billboard->title}",
            sprintf(
                'KES %s received for %s to %s. The dates are now locked in.',
                number_format($payment->amount),
                $booking->start_date->format('M j, Y'),
                $booking->end_date->format('M j, Y'),
            ),
        );

        // Receipt + contract PDFs go out to the customer on confirmation.
        app(CustomerMailer::class)->paymentReceipt($payment);

        return $payment;
    }

    private function generateReference(): string
    {
        return 'TGZ-'.strtoupper(Str::random(12));
    }
}
