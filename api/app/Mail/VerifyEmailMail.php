<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class VerifyEmailMail extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    public function __construct(public User $user) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirm your email — Tangazaa');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.verify-email',
            with: [
                'name' => $this->user->name,
                'url' => $this->verificationUrl(),
                'expiresMinutes' => (int) config('auth.verification.expire', 60),
            ],
        );
    }

    /**
     * A signed link at the API (so the signature validates server-side); the
     * route then bounces the browser to the SPA. Hashing the email means the
     * link dies the moment the address changes.
     */
    private function verificationUrl(): string
    {
        return URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes((int) config('auth.verification.expire', 60)),
            [
                'id' => $this->user->getKey(),
                'hash' => sha1($this->user->getEmailForVerification()),
            ],
        );
    }
}
