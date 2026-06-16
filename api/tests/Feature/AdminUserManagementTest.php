<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminUserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_list_users(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->owner()->create(['name' => 'Owner One']);
        User::factory()->create(['name' => 'Customer One']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
    }

    public function test_an_admin_can_search_users(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->create(['name' => 'Findme Co']);
        User::factory()->create(['name' => 'Someone Else']);

        $response = $this->actingAs($admin)->getJson('/api/admin/users?search=Findme');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Findme Co');
    }

    public function test_an_admin_can_filter_users_by_role(): void
    {
        $admin = User::factory()->admin()->create();
        User::factory()->owner()->count(2)->create();
        User::factory()->count(3)->create();

        $response = $this->actingAs($admin)->getJson('/api/admin/users?role=owner');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }

    public function test_an_admin_can_suspend_and_reactivate_a_user(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create(['is_suspended' => false]);

        $response = $this->actingAs($admin)->patchJson("/api/admin/users/{$target->id}/toggle-suspension");
        $response->assertOk();
        $response->assertJsonPath('data.is_suspended', true);
        $this->assertDatabaseHas('users', ['id' => $target->id, 'is_suspended' => true]);

        $response = $this->actingAs($admin)->patchJson("/api/admin/users/{$target->id}/toggle-suspension");
        $response->assertOk();
        $response->assertJsonPath('data.is_suspended', false);
    }

    public function test_an_admin_cannot_suspend_their_own_account(): void
    {
        $admin = User::factory()->admin()->create();

        $response = $this->actingAs($admin)->patchJson("/api/admin/users/{$admin->id}/toggle-suspension");

        $response->assertStatus(422);
        $this->assertDatabaseHas('users', ['id' => $admin->id, 'is_suspended' => false]);
    }

    public function test_a_non_admin_cannot_list_or_suspend_users(): void
    {
        $owner = User::factory()->owner()->create();
        $target = User::factory()->create();

        $this->actingAs($owner)->getJson('/api/admin/users')->assertForbidden();
        $this->actingAs($owner)->patchJson("/api/admin/users/{$target->id}/toggle-suspension")->assertForbidden();
    }
}
