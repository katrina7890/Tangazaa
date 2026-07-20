<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PartnerAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_analytics_reports_occupancy_revenue_split_and_vacancy_insights(): void
    {
        $owner = User::factory()->owner()->create();
        $occupied = Billboard::factory()->create(['owner_id' => $owner->id]);
        // Vacant for a long time → should produce a vacancy insight.
        Billboard::factory()->create([
            'owner_id' => $owner->id,
            'available_from' => Carbon::today()->subDays(30),
        ]);

        Booking::factory()->create([
            'billboard_id' => $occupied->id,
            'status' => 'confirmed',
            'start_date' => Carbon::today()->subDays(5),
            'end_date' => Carbon::today()->addDays(30),
            'total_price' => 100000,
        ]);
        Booking::factory()->create([
            'billboard_id' => $occupied->id,
            'status' => 'confirmed',
            'source' => 'offline',
            'customer_id' => null,
            'contact_id' => Contact::factory()->create(['owner_id' => $owner->id])->id,
            'start_date' => Carbon::today()->addDays(60),
            'end_date' => Carbon::today()->addDays(90),
            'total_price' => 50000,
        ]);

        $response = $this->actingAs($owner)->getJson('/api/partner/analytics');

        $response->assertOk();
        $response->assertJsonPath('stats.occupancy_rate', 50);
        $response->assertJsonPath('stats.app_revenue', 100000);
        $response->assertJsonPath('stats.offline_revenue', 50000);
        $this->assertNotEmpty($response->json('revenue_by_billboard'));
        $this->assertNotEmpty($response->json('most_booked_locations'));
        $this->assertTrue(
            collect($response->json('insights'))->contains(fn ($insight) => $insight['type'] === 'vacancy'),
        );

        // Staff see operations but never money.
        $staff = User::factory()->staffOf($owner)->create();
        $staffView = $this->actingAs($staff)->getJson('/api/partner/analytics');
        $staffView->assertOk();
        $this->assertNull($staffView->json('stats.app_revenue'));
        $this->assertEmpty($staffView->json('revenue_by_billboard'));
    }

    public function test_the_crm_client_file_reports_campaigns_revenue_and_outstanding(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        // A past offline campaign (paid outside the app — nothing outstanding).
        Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'status' => 'confirmed',
            'source' => 'offline',
            'customer_id' => null,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->subDays(90),
            'end_date' => Carbon::today()->subDays(50),
            'total_price' => 80000,
        ]);
        // A current one.
        Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'status' => 'confirmed',
            'source' => 'offline',
            'customer_id' => null,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->subDays(5),
            'end_date' => Carbon::today()->addDays(40),
            'total_price' => 120000,
        ]);

        $response = $this->actingAs($owner)->getJson("/api/partner/contacts/{$contact->id}");

        $response->assertOk();
        $response->assertJsonPath('summary.revenue', 200000);
        $response->assertJsonPath('summary.current_campaigns', 1);
        $response->assertJsonPath('summary.past_campaigns', 1);
        $response->assertJsonPath('summary.outstanding', 0);
        $response->assertJsonCount(2, 'bookings');

        // Another owner can't open this client file.
        $intruder = User::factory()->owner()->create();
        $this->actingAs($intruder)->getJson("/api/partner/contacts/{$contact->id}")->assertForbidden();
    }

    public function test_billboards_accept_the_rich_erp_fields_and_archiving_hides_them_from_the_marketplace(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->putJson("/api/billboards/{$billboard->id}", [
            'title' => $billboard->title,
            'location' => $billboard->location,
            'lat' => $billboard->lat,
            'lng' => $billboard->lng,
            'size' => $billboard->size,
            'type' => $billboard->type->value,
            'price_per_day' => $billboard->price_per_day,
            'price_per_week' => $billboard->price_per_week,
            'road' => 'Waiyaki Way, westbound',
            'lighting' => 'led',
            'orientation' => 'landscape',
            'daily_traffic' => 45000,
            'visibility_score' => 9,
            'discount_pct' => 15,
            'tags' => ['premium', 'highway'],
            'amenities' => ['Sarit Centre', 'ABC Place'],
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.lighting', 'led');
        $response->assertJsonPath('data.visibility_score', 9);
        $response->assertJsonPath('data.discount_pct', 15);
        $response->assertJsonPath('data.tags.0', 'premium');

        // Archive it — gone from the public marketplace, still in the owner's list.
        $this->actingAs($owner)->putJson("/api/billboards/{$billboard->id}", [
            'title' => $billboard->title,
            'location' => $billboard->location,
            'lat' => $billboard->lat,
            'lng' => $billboard->lng,
            'size' => $billboard->size,
            'type' => $billboard->type->value,
            'price_per_day' => $billboard->price_per_day,
            'price_per_week' => $billboard->price_per_week,
            'archived' => true,
        ])->assertJsonPath('data.archived', true);

        $this->assertFalse(
            collect($this->getJson('/api/billboards')->json('data'))->contains('id', $billboard->id),
        );
        $this->assertTrue(
            collect($this->actingAs($owner)->getJson('/api/my/billboards')->json('data'))->contains('id', $billboard->id),
        );
    }
}
