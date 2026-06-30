<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BillboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_can_browse_active_billboards(): void
    {
        Billboard::factory()->create(['is_active' => true]);
        Billboard::factory()->create(['is_active' => false]);

        $response = $this->getJson('/api/billboards');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_guests_can_view_a_single_billboard(): void
    {
        $billboard = Billboard::factory()->create();

        $response = $this->getJson("/api/billboards/{$billboard->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $billboard->id);
    }

    public function test_an_owner_can_create_a_billboard(): void
    {
        $owner = User::factory()->owner()->create();

        $response = $this->actingAs($owner)->postJson('/api/billboards', [
            'title' => 'Test Billboard',
            'location' => 'Westlands, Nairobi',
            'lat' => -1.2672,
            'lng' => 36.8056,
            'size' => '10ft x 20ft',
            'type' => 'digital_led',
            'price_per_day' => 5000,
            'price_per_week' => 35000,
            'description' => 'A test billboard.',
            'available_from' => Carbon::today()->addWeek()->toDateString(),
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('billboards', ['title' => 'Test Billboard', 'owner_id' => $owner->id]);
    }

    public function test_a_customer_cannot_create_a_billboard(): void
    {
        $customer = User::factory()->create();

        $response = $this->actingAs($customer)->postJson('/api/billboards', [
            'title' => 'Test Billboard',
            'location' => 'Westlands, Nairobi',
            'lat' => -1.2672,
            'lng' => 36.8056,
            'size' => '10ft x 20ft',
            'type' => 'digital_led',
            'price_per_day' => 5000,
            'price_per_week' => 35000,
        ]);

        $response->assertForbidden();
    }

    public function test_an_owner_cannot_update_another_owners_billboard(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create();

        $response = $this->actingAs($owner)->putJson("/api/billboards/{$billboard->id}", [
            'title' => 'Hijacked',
            'location' => $billboard->location,
            'lat' => $billboard->lat,
            'lng' => $billboard->lng,
            'size' => $billboard->size,
            'type' => $billboard->type->value,
            'price_per_day' => $billboard->price_per_day,
            'price_per_week' => $billboard->price_per_week,
        ]);

        $response->assertForbidden();
    }

    public function test_an_owner_can_update_their_own_billboard(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->putJson("/api/billboards/{$billboard->id}", [
            'title' => 'Updated Title',
            'location' => $billboard->location,
            'lat' => $billboard->lat,
            'lng' => $billboard->lng,
            'size' => $billboard->size,
            'type' => $billboard->type->value,
            'price_per_day' => $billboard->price_per_day,
            'price_per_week' => $billboard->price_per_week,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('billboards', ['id' => $billboard->id, 'title' => 'Updated Title']);
    }

    public function test_an_admin_can_delete_any_billboard(): void
    {
        $admin = User::factory()->admin()->create();
        $billboard = Billboard::factory()->create();

        $response = $this->actingAs($admin)->deleteJson("/api/billboards/{$billboard->id}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('billboards', ['id' => $billboard->id]);
    }

    public function test_an_owner_can_see_their_own_billboards_including_inactive(): void
    {
        $owner = User::factory()->owner()->create();
        Billboard::factory()->create(['owner_id' => $owner->id, 'is_active' => false]);
        Billboard::factory()->create(['owner_id' => $owner->id, 'is_active' => true]);
        Billboard::factory()->create(); // someone else's billboard

        $response = $this->actingAs($owner)->getJson('/api/my/billboards');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }
}
