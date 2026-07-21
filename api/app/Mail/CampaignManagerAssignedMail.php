<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CampaignManagerAssignedMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public Booking $booking) {}

    public function envelope(): Envelope
    {
        $manager = $this->booking->accountManager;

        return new Envelope(
            subject: "{$manager->name} is running your campaign",
            // Replies should reach the actual salesperson, not the platform.
            replyTo: [new Address($manager->email, $manager->name)],
        );
    }

    public function content(): Content
    {
        $booking = $this->booking->loadMissing('billboard.owner.partnerSettings', 'accountManager', 'customer');
        $owner = $booking->billboard->owner;

        return new Content(
            view: 'emails.campaign-manager-assigned',
            with: [
                'name' => $booking->customer->name,
                'booking' => $booking,
                'manager' => $booking->accountManager,
                'company' => $owner->company_name ?: $owner->name,
                // The individual's own number if they set one, else the
                // company switchboard from Partner settings.
                'phone' => $booking->accountManager->phone ?: $owner->partnerSettings?->contact_phone,
                'workingHours' => $owner->partnerSettings?->working_hours,
                'chatUrl' => config('app.frontend_url').'/dashboard/messages',
                'manageUrl' => config('app.frontend_url').'/dashboard/profile',
            ],
        );
    }
}
