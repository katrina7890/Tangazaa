<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PartnerOfflineBookingTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_owner_can_record_an_offline_booking_which_is_confirmed_immediately(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id, 'price_per_day' => 1000]);
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->postJson('/api/partner/offline-bookings', [
            'billboard_id' => $billboard->id,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->addDays(5)->toDateString(),
            'end_date' => Carbon::today()->addDays(14)->toDateString(),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'confirmed');
        $response->assertJsonPath('data.source', 'offline');
        $response->assertJsonPath('data.contact.name', $contact->name);
        // 10 days at 1000/day, derived because no negotiated price was sent.
        $response->assertJsonPath('data.total_price', 10000);
    }

    public function test_an_offline_booking_can_record_a_negotiated_price_and_a_past_start(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        // Campaign already running — started last week, closed on a handshake.
        $response = $this->actingAs($owner)->postJson('/api/partner/offline-bookings', [
            'billboard_id' => $billboard->id,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->subDays(7)->toDateString(),
            'end_date' => Carbon::today()->addDays(23)->toDateString(),
            'total_price' => 150000,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.total_price', 150000);
    }

    public function test_an_offline_booking_blocks_the_dates_for_app_customers(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($owner)->postJson('/api/partner/offline-bookings', [
            'billboard_id' => $billboard->id,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->addDays(10)->toDateString(),
            'end_date' => Carbon::today()->addDays(40)->toDateString(),
        ])->assertCreated();

        $customer = User::factory()->create();
        $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->addDays(20)->toDateString(),
            'end_date' => Carbon::today()->addDays(55)->toDateString(),
        ])->assertJsonValidationErrors('start_date');
    }

    public function test_an_offline_booking_cannot_overlap_a_confirmed_booking(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'status' => 'confirmed',
            'start_date' => Carbon::today()->addDays(10),
            'end_date' => Carbon::today()->addDays(40),
        ]);

        $this->actingAs($owner)->postJson('/api/partner/offline-bookings', [
            'billboard_id' => $billboard->id,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->addDays(30)->toDateString(),
            'end_date' => Carbon::today()->addDays(60)->toDateString(),
        ])->assertJsonValidationErrors('start_date');
    }

    public function test_an_owner_cannot_record_an_offline_booking_on_another_owners_billboard(): void
    {
        $owner = User::factory()->owner()->create();
        $foreignBillboard = Billboard::factory()->create();
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($owner)->postJson('/api/partner/offline-bookings', [
            'billboard_id' => $foreignBillboard->id,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->toDateString(),
            'end_date' => Carbon::today()->addDays(30)->toDateString(),
        ])->assertJsonValidationErrors('billboard_id');
    }

    public function test_the_partner_bookings_list_shows_app_and_offline_bookings_together(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        Booking::factory()->create(['billboard_id' => $billboard->id]); // app booking
        $this->actingAs($owner)->postJson('/api/partner/offline-bookings', [
            'billboard_id' => $billboard->id,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->addDays(60)->toDateString(),
            'end_date' => Carbon::today()->addDays(90)->toDateString(),
        ])->assertCreated();

        $response = $this->actingAs($owner)->getJson('/api/partner/bookings');
        $response->assertOk();
        $response->assertJsonCount(2, 'data');

        $offlineOnly = $this->actingAs($owner)->getJson('/api/partner/bookings?source=offline');
        $offlineOnly->assertOk();
        $offlineOnly->assertJsonCount(1, 'data');
        $offlineOnly->assertJsonPath('data.0.source', 'offline');
    }
}
