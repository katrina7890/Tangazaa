<?php

namespace App\Enums;

/**
 * The Glovo-style delivery stages of a billboard campaign, in order. The
 * company posts updates against a stage; the customer's tracker derives how
 * far along the campaign is from the furthest stage that has an update.
 */
enum CampaignStage: string
{
    case AgentContact = 'agent_contact';
    case Artwork = 'artwork';
    case Production = 'production';
    case Installation = 'installation';

    /** Position in the timeline (0-based), for "furthest stage" comparisons. */
    public function order(): int
    {
        return array_search($this, self::cases(), true);
    }
}
