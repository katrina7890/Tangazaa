<?php

namespace App\Mail;

use App\Models\Payment;
use App\Services\Documents\DocumentService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Payment $payment) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment received — your campaign is confirmed',
        );
    }

    public function content(): Content
    {
        $booking = $this->payment->booking->loadMissing('billboard.owner', 'accountManager');

        return new Content(
            view: 'emails.payment-receipt',
            with: [
                'name' => $booking->customer->name,
                'payment' => $this->payment,
                'booking' => $booking,
                'company' => $booking->billboard->owner->company_name ?: $booking->billboard->owner->name,
                'trackUrl' => config('app.frontend_url')."/dashboard/bookings/{$booking->id}/progress",
                'manageUrl' => config('app.frontend_url').'/dashboard/profile',
            ],
        );
    }

    /**
     * The receipt and the contract travel with the email so the customer has
     * both on file without needing to log in. Both are regenerated here rather
     * than stored — see DocumentService.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        $documents = app(DocumentService::class);

        [$receipt, $receiptName] = $documents->receipt($this->payment);
        [$contract, $contractName] = $documents->contract($this->payment->booking);

        return [
            Attachment::fromData(fn () => $receipt, $receiptName)->withMime('application/pdf'),
            Attachment::fromData(fn () => $contract, $contractName)->withMime('application/pdf'),
        ];
    }
}
