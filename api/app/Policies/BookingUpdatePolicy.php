<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\BookingUpdate;
use App\Models\User;

class BookingUpdatePolicy
{
    /** Partner side: list the progress timeline of a booking on your boards. */
    public function viewAny(User $user, Booking $booking): bool
    {
        return $this->managesBooking($user, $booking);
    }

    /** Partner side: post a progress update on a booking on your boards. */
    public function create(User $user, Booking $booking): bool
    {
        return $this->managesBooking($user, $booking);
    }

    public function delete(User $user, BookingUpdate $bookingUpdate): bool
    {
        return $this->managesBooking($user, $bookingUpdate->booking);
    }

    private function managesBooking(User $user, Booking $booking): bool
    {
        // partnerOwnerId lets staff act on their employer's bookings.
        return $user->isAdmin() || $user->partnerOwnerId() === $booking->billboard->owner_id;
    }
}
