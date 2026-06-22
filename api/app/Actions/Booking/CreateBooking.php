<?php

namespace App\Actions\Booking;

use App\Enums\BookingStatus;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class CreateBooking
{
    public const MIN_CAMPAIGN_DAYS = 30;

    public function handle(User $customer, Billboard $billboard, string $startDate, string $endDate): Booking
    {
        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->startOfDay();
        $days = (int) $start->diffInDays($end) + 1;

        if ($days < self::MIN_CAMPAIGN_DAYS) {
            throw ValidationException::withMessages([
                'end_date' => ['Campaigns must run for at least '.self::MIN_CAMPAIGN_DAYS.' days.'],
            ]);
        }

        $overlaps = $billboard->bookings()
            ->where('status', BookingStatus::Confirmed)
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start)
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'start_date' => ['This billboard is already booked for part of the selected dates.'],
            ]);
        }

        // Created unconfirmed — the booking is only held once payment succeeds
        // (see App\Services\Payments\PaystackService). Until then it doesn't block
        // the dates for other customers (booked_ranges only counts Confirmed).
        return $billboard->bookings()->create([
            'customer_id' => $customer->id,
            'start_date' => $start,
            'end_date' => $end,
            'total_price' => $days * $billboard->price_per_day,
            'status' => BookingStatus::Pending,
        ]);
    }
}
