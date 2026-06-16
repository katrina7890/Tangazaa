<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_can_view_platform_stats(): void
    {
        $admin = User::factory()->admin()->create();
        $owners = User::factory()->owner()->count(2)->create();
        User::factory()->count(3)->create();
        Billboard::factory()->count(4)->create(['owner_id' => $owners->first()->id]);

        $response = $this->actingAs($admin)->getJson('/api/admin/stats');

        $response->assertOk();
        $response->assertJsonPath('companies', 2);
        $response->assertJsonPath('billboards_active', 4);
        $response->assertJsonPath('customers', 3);
    }

    public function test_an_admin_can_view_login_attempts(): void
    {
        $admin = User::factory()->admin()->create();
        LoginAttempt::create([
            'email' => 'someone@example.com',
            'successful' => false,
            'is_suspicious' => true,
            'suspicious_reason' => 'Repeated failed login attempts',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/login-attempts');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.is_suspicious', true);
    }

    public function test_a_non_admin_cannot_view_platform_stats(): void
    {
        $owner = User::factory()->owner()->create();

        $response = $this->actingAs($owner)->getJson('/api/admin/stats');

        $response->assertForbidden();
    }

    public function test_a_customer_cannot_view_login_attempts(): void
    {
        $customer = User::factory()->create();

        $response = $this->actingAs($customer)->getJson('/api/admin/login-attempts');

        $response->assertForbidden();
    }
}
