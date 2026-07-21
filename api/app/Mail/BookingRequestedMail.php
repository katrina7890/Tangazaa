<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingRequestedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Booking $booking) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Booking received — '.$this->booking->billboard->title,
        );
    }

    public function content(): Content
    {
        $booking = $this->booking->loadMissing('billboard.owner');

        return new Content(
            view: 'emails.booking-requested',
            with: [
                'name' => $booking->customer->name,
                'booking' => $booking,
                'company' => $booking->billboard->owner->company_name ?: $booking->billboard->owner->name,
                'payUrl' => config('app.frontend_url').'/dashboard/payments',
                'manageUrl' => config('app.frontend_url').'/dashboard/profile',
            ],
        );
    }
}
