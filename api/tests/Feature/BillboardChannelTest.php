<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class BillboardChannelTest extends TestCase
{
    use RefreshDatabase;

    public function test_offline_and_maintenance_billboards_are_hidden_from_the_public_marketplace(): void
    {
        $online = Billboard::factory()->create();
        Billboard::factory()->create(['channel' => 'offline']);
        Billboard::factory()->create(['under_maintenance' => true]);

        $response = $this->getJson('/api/billboards');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $online->id);
    }

    public function test_an_offline_billboard_detail_page_is_a_404_for_the_public(): void
    {
        $offline = Billboard::factory()->create(['channel' => 'offline']);

        $this->getJson("/api/billboards/{$offline->id}")->assertNotFound();
    }

    public function test_customers_cannot_book_offline_or_maintenance_billboards(): void
    {
        $customer = User::factory()->create();
        $offline = Billboard::factory()->create(['channel' => 'offline']);
        $broken = Billboard::factory()->create(['under_maintenance' => true]);

        foreach ([$offline, $broken] as $billboard) {
            $this->actingAs($customer)->postJson('/api/bookings', [
                'billboard_id' => $billboard->id,
                'start_date' => Carbon::today()->addDays(5)->toDateString(),
                'end_date' => Carbon::today()->addDays(40)->toDateString(),
            ])->assertJsonValidationErrors('billboard_id');
        }
    }

    public function test_the_owner_still_sees_offline_and_maintenance_boards_in_their_inventory(): void
    {
        $owner = User::factory()->owner()->create();
        Billboard::factory()->create(['owner_id' => $owner->id]);
        Billboard::factory()->create(['owner_id' => $owner->id, 'channel' => 'offline']);
        Billboard::factory()->create(['owner_id' => $owner->id, 'under_maintenance' => true]);

        $response = $this->actingAs($owner)->getJson('/api/my/billboards');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    }

    public function test_an_owner_can_move_a_board_between_channels_and_toggle_maintenance(): void
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
            'channel' => 'offline',
            'under_maintenance' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.channel', 'offline');
        $response->assertJsonPath('data.under_maintenance', true);
    }
}
