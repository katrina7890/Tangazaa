<?php

namespace App\Services\Mail;

use App\Enums\EmailTopic;
use App\Mail\BookingCancelledMail;
use App\Mail\BookingRequestedMail;
use App\Mail\CampaignManagerAssignedMail;
use App\Mail\CampaignStageUpdateMail;
use App\Mail\PaymentReceiptMail;
use App\Models\Booking;
use App\Models\BookingUpdate;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * The single place customer-facing transactional email is dispatched from.
 *
 * Centralised for three reasons that every call site would otherwise repeat:
 * offline bookings have no `customer` user at all (the client is a CRM contact,
 * not a platform account), opt-outs are per-topic, and a mail failure must
 * never roll back the business action that triggered it — a booking is still a
 * booking if the SMTP host is down.
 */
class CustomerMailer
{
    public function bookingRequested(Booking $booking): void
    {
        $this->send($booking->customer, new BookingRequestedMail($booking), EmailTopic::BookingRequested);
    }

    /** The receipt is a financial record, so it ignores preferences. */
    public function paymentReceipt(Payment $payment): void
    {
        $this->send($payment->booking->customer, new PaymentReceiptMail($payment), topic: null);
    }

    public function campaignManagerAssigned(Booking $booking): void
    {
        $this->send($booking->customer, new CampaignManagerAssignedMail($booking), EmailTopic::AccountManager);
    }

    public function campaignUpdate(BookingUpdate $update): void
    {
        $this->send($update->booking->customer, new CampaignStageUpdateMail($update), EmailTopic::CampaignUpdates);
    }

    public function bookingCancelled(Booking $booking, bool $byCustomer): void
    {
        $this->send($booking->customer, new BookingCancelledMail($booking, $byCustomer), EmailTopic::BookingCancelled);
    }

    /**
     * @param  EmailTopic|null  $topic  Null for mail the customer can't opt out
     *                                  of (receipts, account security).
     */
    private function send(?User $customer, Mailable $mailable, ?EmailTopic $topic): void
    {
        if (! $customer || ! $customer->email) {
            return;
        }

        if ($topic && ! $customer->wantsEmail($topic)) {
            return;
        }

        try {
            Mail::to($customer)->send($mailable);
        } catch (Throwable $e) {
            // Queued sends fail on the worker, but a sync driver (or a failure
            // to reach the queue itself) would otherwise surface as a 500 on an
            // action that actually succeeded.
            Log::error('Customer mail failed to dispatch', [
                'mailable' => $mailable::class,
                'user_id' => $customer->id,
                'error' => $e->getMessage(),
            ]);
        }
    }
}
