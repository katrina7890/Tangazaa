<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerBookingCancelTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_customer_can_cancel_their_own_booking(): void
    {
        $customer = User::factory()->create();
        $booking = Booking::factory()->create([
            'customer_id' => $customer->id,
            'status' => BookingStatus::Confirmed,
        ]);

        $response = $this->actingAs($customer)->patchJson("/api/bookings/{$booking->id}/cancel");

        $response->assertOk();
        $response->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => BookingStatus::Cancelled->value,
        ]);
    }

    public function test_a_customer_cannot_cancel_someone_elses_booking(): void
    {
        $customer = User::factory()->create();
        $booking = Booking::factory()->create([
            'status' => BookingStatus::Confirmed,
        ]);

        $response = $this->actingAs($customer)->patchJson("/api/bookings/{$booking->id}/cancel");

        $response->assertForbidden();
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => BookingStatus::Confirmed->value,
        ]);
    }

    public function test_cancelling_an_already_cancelled_booking_is_rejected(): void
    {
        $customer = User::factory()->create();
        $booking = Booking::factory()->create([
            'customer_id' => $customer->id,
            'status' => BookingStatus::Cancelled,
        ]);

        $response = $this->actingAs($customer)->patchJson("/api/bookings/{$booking->id}/cancel");

        $response->assertUnprocessable();
    }

    public function test_an_owner_cannot_use_the_customer_cancel_endpoint(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = Booking::factory()->create(['status' => BookingStatus::Confirmed]);

        $response = $this->actingAs($owner)->patchJson("/api/bookings/{$booking->id}/cancel");

        $response->assertForbidden();
    }
}
