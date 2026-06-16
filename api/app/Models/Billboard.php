<?php

namespace App\Models;

use App\Enums\BillboardType;
use Database\Factories\BillboardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['owner_id', 'title', 'location', 'lat', 'lng', 'size', 'type', 'price_per_day', 'price_per_week', 'description', 'is_active'])]
class Billboard extends Model
{
    /** @use HasFactory<BillboardFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'type' => BillboardType::class,
            'price_per_day' => 'integer',
            'price_per_week' => 'integer',
            'is_active' => 'boolean',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
