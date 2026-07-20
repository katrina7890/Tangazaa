<?php

namespace App\Enums;

/**
 * The fixed operational pipeline every booking moves through in the Partner
 * ERP — package-tracking style. Distinct from CampaignStage (the customer-
 * facing update feed): this is the owner's internal state machine.
 */
enum PipelineStage: string
{
    case Confirmed = 'confirmed';
    case Artwork = 'artwork';
    case Printing = 'printing';
    case InstallationScheduled = 'installation_scheduled';
    case Installed = 'installed';
    case CampaignActive = 'campaign_active';
    case PaymentReleased = 'payment_released';

    /** Position in the pipeline (0-based). */
    public function order(): int
    {
        return array_search($this, self::cases(), true);
    }

    /** The sub-states a stage can sit in before it's completed. */
    public function substatuses(): array
    {
        return match ($this) {
            self::Artwork => ['waiting', 'client_providing', 'provider_designing', 'approved'],
            self::Printing => ['client_printing', 'provider_printing', 'completed'],
            default => [],
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Confirmed => 'Booking confirmed',
            self::Artwork => 'Artwork',
            self::Printing => 'Printing',
            self::InstallationScheduled => 'Installation scheduled',
            self::Installed => 'Billboard installed',
            self::CampaignActive => 'Campaign active',
            self::PaymentReleased => 'Vendor payment released',
        };
    }
}
