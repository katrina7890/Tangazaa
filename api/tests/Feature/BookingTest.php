<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
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
            'start_date' => Carbon::today()->addDay()->toDateString(),
            'end_date' => Carbon::today()->addDays(30)->toDateString(),
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
            'start_date' => Carbon::today()->addDay()->toDateString(),
            'end_date' => Carbon::today()->addDays(10)->toDateString(),
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('end_date');
    }

    public function test_a_booking_in_the_past_is_rejected(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create();

        $response = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->subDays(5)->toDateString(),
            'end_date' => Carbon::today()->addDays(30)->toDateString(),
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('start_date');
    }

    public function test_a_booking_before_the_billboard_is_available_is_rejected(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create([
            'available_from' => Carbon::today()->addMonth()->toDateString(),
        ]);

        $response = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->addDay()->toDateString(),
            'end_date' => Carbon::today()->addDays(31)->toDateString(),
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('start_date');
    }

    public function test_an_overlapping_booking_is_rejected(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create();

        Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->addDay()->toDateString(),
            'end_date' => Carbon::today()->addDays(31)->toDateString(),
        ]);

        $response = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->addDays(20)->toDateString(),
            'end_date' => Carbon::today()->addDays(56)->toDateString(),
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
            'start_date' => Carbon::today()->addDay()->toDateString(),
            'end_date' => Carbon::today()->addDays(30)->toDateString(),
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
