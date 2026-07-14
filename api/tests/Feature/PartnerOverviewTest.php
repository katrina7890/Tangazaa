<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Contact;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PartnerOverviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_overview_reports_occupancy_per_billboard(): void
    {
        $owner = User::factory()->owner()->create();

        $occupied = Billboard::factory()->create(['owner_id' => $owner->id]);
        $vacant = Billboard::factory()->create(['owner_id' => $owner->id]);
        Billboard::factory()->create(); // another owner's — must not appear

        Booking::factory()->create([
            'billboard_id' => $occupied->id,
            'status' => 'confirmed',
            'start_date' => Carbon::today()->subDays(5),
            'end_date' => Carbon::today()->addDays(25),
            'total_price' => 90000,
        ]);

        $response = $this->actingAs($owner)->getJson('/api/partner/overview');

        $response->assertOk();
        $response->assertJsonPath('stats.billboards', 2);
        $response->assertJsonPath('stats.occupied_today', 1);
        $response->assertJsonPath('stats.vacant_today', 1);
        $response->assertJsonPath('stats.confirmed_revenue', 90000);

        $byId = collect($response->json('billboards'))->keyBy('id');
        $this->assertTrue($byId[$occupied->id]['occupied']);
        $this->assertNotNull($byId[$occupied->id]['current_booking']);
        $this->assertFalse($byId[$vacant->id]['occupied']);
        $this->assertNull($byId[$vacant->id]['current_booking']);
    }

    public function test_the_overview_counts_open_work_orders_and_contacts(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        Contact::factory()->count(2)->create(['owner_id' => $owner->id]);
        WorkOrder::factory()->create(['owner_id' => $owner->id, 'billboard_id' => $billboard->id]);
        WorkOrder::factory()->completed()->create(['owner_id' => $owner->id, 'billboard_id' => $billboard->id]);

        $response = $this->actingAs($owner)->getJson('/api/partner/overview');

        $response->assertOk();
        $response->assertJsonPath('stats.contacts', 2);
        $response->assertJsonPath('stats.open_work_orders', 1);
    }
}
