<?php

namespace App\Models;

use App\Enums\CampaignStage;
use App\Enums\ClientReaction;
use Database\Factories\BookingUpdateFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['booking_id', 'user_id', 'stage', 'message', 'photos', 'requires_approval', 'client_reaction', 'client_comment'])]
class BookingUpdate extends Model
{
    /** @use HasFactory<BookingUpdateFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'stage' => CampaignStage::class,
            'photos' => 'array',
            'requires_approval' => 'boolean',
            'client_reaction' => ClientReaction::class,
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
