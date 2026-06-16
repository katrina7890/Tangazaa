<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminBillboardManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_list_all_billboards_with_owner_info(): void
    {
        $admin = User::factory()->admin()->create();
        $owner = User::factory()->owner()->create(['company_name' => 'Acme Outdoor']);
        Billboard::factory()->create(['owner_id' => $owner->id, 'is_active' => false]);
        Billboard::factory()->count(2)->create();

        $response = $this->actingAs($admin)->getJson('/api/admin/billboards');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
        $response->assertJsonFragment(['company_name' => 'Acme Outdoor']);
    }

    public function test_an_admin_can_search_billboards(): void
    {
        $admin = User::factory()->admin()->create();
        Billboard::factory()->create(['title' => 'Unique Westlands Board']);
        Billboard::factory()->create(['title' => 'Something Else']);

        $response = $this->actingAs($admin)->getJson('/api/admin/billboards?search=Westlands');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_an_admin_can_deactivate_any_billboard_via_the_existing_update_route(): void
    {
        $admin = User::factory()->admin()->create();
        $billboard = Billboard::factory()->create(['is_active' => true]);

        $response = $this->actingAs($admin)->putJson("/api/billboards/{$billboard->id}", [
            'title' => $billboard->title,
            'location' => $billboard->location,
            'lat' => $billboard->lat,
            'lng' => $billboard->lng,
            'size' => $billboard->size,
            'type' => $billboard->type->value,
            'price_per_day' => $billboard->price_per_day,
            'price_per_week' => $billboard->price_per_week,
            'is_active' => false,
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('billboards', ['id' => $billboard->id, 'is_active' => false]);
    }

    public function test_a_non_admin_cannot_list_all_billboards(): void
    {
        $owner = User::factory()->owner()->create();

        $this->actingAs($owner)->getJson('/api/admin/billboards')->assertForbidden();
    }
}
