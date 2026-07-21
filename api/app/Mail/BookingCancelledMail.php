<?php

namespace App\Mail;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingCancelledMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * @param  bool  $byCustomer  Whether the customer cancelled it themselves —
     *                            the copy differs sharply between "you did this"
     *                            and "this was done to your campaign".
     */
    public function __construct(public Booking $booking, public bool $byCustomer = true) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking cancelled — '.$this->booking->billboard->title,
        );
    }

    public function content(): Content
    {
        $booking = $this->booking->loadMissing('billboard.owner.partnerSettings', 'customer');
        $owner = $booking->billboard->owner;

        return new Content(
            view: 'emails.booking-cancelled',
            with: [
                'name' => $booking->customer->name,
                'booking' => $booking,
                'byCustomer' => $this->byCustomer,
                'company' => $owner->company_name ?: $owner->name,
                'companyEmail' => $owner->partnerSettings?->contact_email,
                'wasPaid' => $booking->payments()
                    ->where('status', PaymentStatus::Success)
                    ->exists(),
                'browseUrl' => config('app.frontend_url').'/map',
                'manageUrl' => config('app.frontend_url').'/dashboard/profile',
            ],
        );
    }
}
