<?php

namespace App\Models;

use App\Enums\BillboardType;
use App\Enums\BookingStatus;
use Database\Factories\BillboardFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

#[Fillable(['owner_id', 'title', 'location', 'lat', 'lng', 'size', 'type', 'price_per_day', 'price_per_week', 'description', 'is_active', 'available_from'])]
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
            'available_from' => 'date',
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

    /**
     * The earliest date a customer can book from: never in the past, never
     * before the owner's `available_from`, and stepped past any confirmed
     * bookings that already cover that starting point.
     */
    public function nextAvailableDate(): Carbon
    {
        $today = now()->startOfDay();
        $cursor = $this->available_from?->startOfDay()->max($today) ?? $today;

        $ranges = $this->bookings
            ->where('status', BookingStatus::Confirmed)
            ->sortBy('start_date');

        foreach ($ranges as $booking) {
            if ($booking->start_date <= $cursor && $cursor <= $booking->end_date) {
                $cursor = $booking->end_date->copy()->addDay()->startOfDay();
            }
        }

        return $cursor;
    }
}
