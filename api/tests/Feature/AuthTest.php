<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_customer_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'company_name' => 'Acme Ads',
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('user.email', 'jane@example.com');
        $response->assertJsonPath('user.role', 'customer');
        $this->assertAuthenticated();

        $this->assertDatabaseHas('users', [
            'email' => 'jane@example.com',
            'role' => 'customer',
        ]);
    }

    public function test_a_billboard_owner_can_register(): void
    {
        $response = $this->postJson('/api/register', [
            'company_name' => 'Billboards Ltd',
            'name' => 'Omar Owner',
            'email' => 'omar@example.com',
            'password' => 'password123',
            'role' => 'owner',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('user.role', 'owner');
    }

    public function test_registration_rejects_the_admin_role(): void
    {
        $response = $this->postJson('/api/register', [
            'company_name' => 'Evil Corp',
            'name' => 'Mallory',
            'email' => 'mallory@example.com',
            'password' => 'password123',
            'role' => 'admin',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('role');
        $this->assertDatabaseMissing('users', ['email' => 'mallory@example.com']);
    }

    public function test_registration_requires_a_unique_email(): void
    {
        User::factory()->create(['email' => 'jane@example.com']);

        $response = $this->postJson('/api/register', [
            'company_name' => 'Acme Ads',
            'name' => 'Jane Doe',
            'email' => 'jane@example.com',
            'password' => 'password123',
            'role' => 'customer',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('email');
    }

    public function test_a_user_can_login_with_correct_credentials(): void
    {
        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk();
        $response->assertJsonPath('user.email', 'jane@example.com');
        $this->assertAuthenticated();
    }

    public function test_login_fails_with_incorrect_password(): void
    {
        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'wrong-password',
        ]);

        $response->assertUnprocessable();
        $this->assertGuest();
    }

    public function test_a_suspended_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'jane@example.com',
            'password' => 'password123',
            'is_suspended' => true,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('email');
        $this->assertGuest();
    }

    public function test_authenticated_user_can_fetch_their_profile(): void
    {
        $user = User::factory()->owner()->create();

        $response = $this->actingAs($user)->getJson('/api/user');

        $response->assertOk();
        $response->assertJsonPath('email', $user->email);
        $response->assertJsonPath('role', UserRole::Owner->value);
    }

    public function test_guest_cannot_fetch_profile(): void
    {
        $response = $this->getJson('/api/user');

        $response->assertUnauthorized();
    }

    public function test_a_user_can_logout(): void
    {
        $user = User::factory()->create(['password' => 'password123']);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk();

        $this->postJson('/api/logout')->assertNoContent();

        // Checked against the 'web' guard directly: Sanctum's RequestGuard caches
        // its resolved user for the test's lifetime, so a second auth:sanctum
        // request here would read a stale cache rather than the real post-logout state.
        $this->assertFalse(Auth::guard('web')->check());
    }

    public function test_failed_logins_are_recorded_and_flagged_after_repeated_attempts(): void
    {
        $user = User::factory()->create(['email' => 'jane@example.com', 'password' => 'password123']);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', [
                'email' => 'jane@example.com',
                'password' => 'wrong-password',
            ]);
        }

        $this->assertSame(5, LoginAttempt::where('email', 'jane@example.com')->count());
        $this->assertTrue(
            LoginAttempt::where('email', 'jane@example.com')->where('is_suspicious', true)->exists()
        );
        $this->assertDatabaseHas('login_attempts', ['email' => 'jane@example.com', 'user_id' => $user->id]);
    }

    public function test_successful_login_from_a_new_ip_is_flagged_as_suspicious(): void
    {
        $user = User::factory()->create(['email' => 'jane@example.com', 'password' => 'password123']);

        LoginAttempt::create([
            'email' => $user->email,
            'user_id' => $user->id,
            'ip_address' => '10.0.0.1',
            'successful' => true,
        ]);

        $this->postJson('/api/login', [
            'email' => 'jane@example.com',
            'password' => 'password123',
        ])->assertOk();

        $latest = LoginAttempt::where('email', 'jane@example.com')->latest('id')->first();
        $this->assertTrue($latest->is_suspicious);
        $this->assertSame('Login from a new IP address', $latest->suspicious_reason);
    }
}
