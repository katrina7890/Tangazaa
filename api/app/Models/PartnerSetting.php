<?php

namespace App\Models;

use App\Enums\BillboardType;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['owner_id', 'logo_path', 'contact_email', 'contact_phone', 'working_hours', 'offers_design', 'design_price', 'offers_printing', 'printing_price', 'installation_price', 'lead_times', 'payout', 'notifications', 'marketplace_visible'])]
class PartnerSetting extends Model
{
    /** Default notice periods (days) per billboard type — PRD's examples. */
    public const DEFAULT_LEAD_TIMES = [
        'standard_4x3' => 7,
        'gantry' => 7,
        'wall_wrap' => 7,
        'digital_led' => 3,
    ];

    protected function casts(): array
    {
        return [
            'offers_design' => 'boolean',
            'offers_printing' => 'boolean',
            'marketplace_visible' => 'boolean',
            'design_price' => 'integer',
            'printing_price' => 'integer',
            'installation_price' => 'integer',
            'lead_times' => 'array',
            'payout' => 'array',
            'notifications' => 'array',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /** Notice days for a billboard type, falling back to the PRD defaults. */
    public function leadDaysFor(BillboardType $type): int
    {
        return (int) ($this->lead_times[$type->value]
            ?? self::DEFAULT_LEAD_TIMES[$type->value]
            ?? 7);
    }
}
