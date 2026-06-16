<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_customer_can_book_a_billboard_for_at_least_30_days(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create(['price_per_day' => 1000]);

        $response = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-30',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.total_price', 30000);
        $this->assertDatabaseHas('bookings', [
            'billboard_id' => $billboard->id,
            'customer_id' => $customer->id,
        ]);
    }

    public function test_a_booking_shorter_than_30_days_is_rejected(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create();

        $response = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-10',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('end_date');
    }

    public function test_an_overlapping_booking_is_rejected(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create();

        Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-31',
        ]);

        $response = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-20',
            'end_date' => '2026-08-25',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('start_date');
    }

    public function test_an_owner_cannot_create_a_booking(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create();

        $response = $this->actingAs($owner)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-30',
        ]);

        $response->assertForbidden();
    }

    public function test_an_owner_can_view_bookings_on_their_billboard(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        Booking::factory()->create(['billboard_id' => $billboard->id]);

        $response = $this->actingAs($owner)->getJson("/api/billboards/{$billboard->id}/bookings");

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_an_owner_cannot_view_bookings_on_someone_elses_billboard(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create();

        $response = $this->actingAs($owner)->getJson("/api/billboards/{$billboard->id}/bookings");

        $response->assertForbidden();
    }
}
