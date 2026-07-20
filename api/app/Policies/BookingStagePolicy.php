<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;

class BookingStagePolicy
{
    public function viewAny(User $user, Booking $booking): bool
    {
        return $this->managesBooking($user, $booking);
    }

    public function update(User $user, Booking $booking): bool
    {
        return $this->managesBooking($user, $booking);
    }

    private function managesBooking(User $user, Booking $booking): bool
    {
        // partnerOwnerId lets staff act on their employer's bookings.
        return $user->isAdmin() || $user->partnerOwnerId() === $booking->billboard->owner_id;
    }
}
