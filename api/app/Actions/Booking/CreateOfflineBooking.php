<?php

namespace App\Actions\Booking;

use App\Enums\BookingSource;
use App\Enums\BookingStatus;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Contact;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

/**
 * Records a deal closed off the app (walk-in, phone, agency) so the billboard's
 * availability on Tangazaa stays truthful. Unlike app bookings there is no
 * payment step and no 30-day minimum — the campaign may even already be running,
 * so past start dates are allowed. It is created Confirmed immediately and
 * therefore blocks those dates for app customers.
 */
class CreateOfflineBooking
{
    public function handle(
        Billboard $billboard,
        Contact $contact,
        string $startDate,
        string $endDate,
        ?int $totalPrice = null,
    ): Booking {
        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->startOfDay();
        $days = (int) $start->diffInDays($end) + 1;

        $overlaps = $billboard->bookings()
            ->where('status', BookingStatus::Confirmed)
            ->where('start_date', '<=', $end)
            ->where('end_date', '>=', $start)
            ->exists();

        if ($overlaps) {
            throw ValidationException::withMessages([
                'start_date' => ['This billboard already has a confirmed booking overlapping those dates.'],
            ]);
        }

        return $billboard->bookings()->create([
            'contact_id' => $contact->id,
            'start_date' => $start,
            'end_date' => $end,
            'total_price' => $totalPrice ?? $days * $billboard->price_per_day,
            'status' => BookingStatus::Confirmed,
            'source' => BookingSource::Offline,
        ]);
    }
}
