<?php

namespace App\Enums;

/**
 * The transactional emails a customer can opt out of.
 *
 * Deliberately excludes email verification and the payment receipt: one is the
 * account-security path and the other is a financial record, so neither is
 * governed by a preference toggle.
 */
enum EmailTopic: string
{
    case BookingRequested = 'booking_requested';
    case CampaignUpdates = 'campaign_updates';
    case AccountManager = 'account_manager';
    case BookingCancelled = 'booking_cancelled';

    public function label(): string
    {
        return match ($this) {
            self::BookingRequested => 'Booking confirmations',
            self::CampaignUpdates => 'Campaign progress updates',
            self::AccountManager => 'Campaign manager introductions',
            self::BookingCancelled => 'Cancellation notices',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::BookingRequested => 'When a booking is placed and is waiting on payment.',
            self::CampaignUpdates => 'Artwork, printing and installation milestones as they happen.',
            self::AccountManager => 'When the billboard company assigns someone to your campaign.',
            self::BookingCancelled => 'When a campaign is cancelled by you or the company.',
        };
    }
}
