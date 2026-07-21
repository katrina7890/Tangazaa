<?php

namespace App\Mail;

use App\Models\BookingUpdate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CampaignStageUpdateMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public BookingUpdate $update) {}

    public function envelope(): Envelope
    {
        $stage = $this->update->stage->label();
        $title = $this->update->booking->billboard->title;

        return new Envelope(
            // Approval requests are the one campaign email that needs to pull
            // the customer back in, so they say so in the subject line.
            subject: $this->update->requires_approval
                ? "Your go-ahead needed — {$title}"
                : "{$stage} — an update on {$title}",
        );
    }

    public function content(): Content
    {
        $update = $this->update->loadMissing('booking.billboard.owner');
        $booking = $update->booking;
        $owner = $booking->billboard->owner;

        return new Content(
            view: 'emails.campaign-stage-update',
            with: [
                'name' => $booking->customer->name,
                'update' => $update,
                'booking' => $booking,
                'stage' => $update->stage->label(),
                'company' => $owner->company_name ?: $owner->name,
                'photoCount' => count($update->photos ?? []),
                'trackUrl' => config('app.frontend_url')."/dashboard/bookings/{$booking->id}/progress",
                'manageUrl' => config('app.frontend_url').'/dashboard/profile',
            ],
        );
    }
}
