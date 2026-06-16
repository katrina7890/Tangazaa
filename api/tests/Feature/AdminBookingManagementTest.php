<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBookingManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_list_all_bookings(): void
    {
        $admin = User::factory()->admin()->create();
        Booking::factory()->count(3)->create();

        $response = $this->actingAs($admin)->getJson('/api/admin/bookings');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    }

    public function test_an_admin_can_search_bookings_by_customer(): void
    {
        $admin = User::factory()->admin()->create();
        $customer = User::factory()->create(['name' => 'Findme Customer']);
        Booking::factory()->create(['customer_id' => $customer->id]);
        Booking::factory()->create();

        $response = $this->actingAs($admin)->getJson('/api/admin/bookings?search=Findme');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_an_admin_can_cancel_a_booking(): void
    {
        $admin = User::factory()->admin()->create();
        $billboard = Billboard::factory()->create();
        $booking = Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'status' => BookingStatus::Confirmed,
        ]);

        $response = $this->actingAs($admin)->patchJson("/api/admin/bookings/{$booking->id}/cancel");

        $response->assertOk();
        $response->assertJsonPath('data.status', 'cancelled');
        $this->assertDatabaseHas('bookings', ['id' => $booking->id, 'status' => 'cancelled']);
    }

    public function test_a_non_admin_cannot_list_or_cancel_bookings(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = Booking::factory()->create();

        $this->actingAs($owner)->getJson('/api/admin/bookings')->assertForbidden();
        $this->actingAs($owner)->patchJson("/api/admin/bookings/{$booking->id}/cancel")->assertForbidden();
    }
}
