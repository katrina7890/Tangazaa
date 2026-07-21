<?php

namespace Tests\Feature;

use App\Actions\Auth\ApplyLoginLockout;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

class AuthLockoutTest extends TestCase
{
    use RefreshDatabase;

    /**
     * The rate limiter and the account lockout are independent controls that
     * happen to trip at similar counts. Tests that target the lockout disable
     * the throttle so the assertion is unambiguous about which one fired;
     * `test_login_is_rate_limited_per_email_and_ip` covers the throttle.
     */
    private function withoutThrottle(): void
    {
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    private function attemptLogin(string $email, string $password = 'wrong-password')
    {
        return $this->postJson('/api/login', ['email' => $email, 'password' => $password]);
    }

    public function test_an_account_locks_after_repeated_failures_and_rejects_the_correct_password(): void
    {
        $this->withoutThrottle();
        $user = User::factory()->create(['email' => 'target@tangaza.test']);

        for ($i = 0; $i < ApplyLoginLockout::MAX_ATTEMPTS; $i++) {
            $this->attemptLogin($user->email)->assertStatus(422);
        }

        $this->assertTrue($user->refresh()->isLocked());

        // Even the *correct* password is refused while locked — that's the
        // whole point of a lockout.
        $response = $this->attemptLogin($user->email, 'password');
        $response->assertStatus(422);
        $this->assertStringContainsString('Too many failed attempts', $response->json('errors.email.0'));
        $this->assertGuest();

        $this->assertDatabaseHas('audit_logs', ['action' => 'auth.account_locked', 'target_id' => $user->id]);
    }

    public function test_a_lockout_expires_and_a_good_login_clears_it(): void
    {
        $user = User::factory()->create(['email' => 'expiry@tangaza.test']);
        $user->forceFill(['locked_until' => now()->subMinute()])->save();

        $this->attemptLogin($user->email, 'password')->assertOk();

        $this->assertNull($user->refresh()->locked_until);
    }

    public function test_failed_logins_never_reveal_whether_an_account_exists(): void
    {
        $this->withoutThrottle();
        User::factory()->create(['email' => 'real@tangaza.test']);

        $known = $this->attemptLogin('real@tangaza.test')->json('errors.email.0');
        $unknown = $this->attemptLogin('ghost@tangaza.test')->json('errors.email.0');

        $this->assertSame($known, $unknown);
        $this->assertSame('The provided credentials are incorrect.', $known);
    }

    public function test_login_is_rate_limited_per_email_and_ip(): void
    {
        // The limiter allows 5/minute for an email+IP pair; the 6th request is
        // rejected by the throttle itself (429) rather than reaching auth.
        $user = User::factory()->create(['email' => 'throttled@tangaza.test']);

        for ($i = 0; $i < 5; $i++) {
            $this->attemptLogin($user->email)->assertStatus(422);
        }

        $this->attemptLogin($user->email)->assertStatus(429);
    }

    public function test_an_admin_can_release_a_locked_account(): void
    {
        $admin = User::factory()->admin()->create();
        $user = User::factory()->create(['locked_until' => now()->addMinutes(15)]);

        $this->actingAs($admin)->patchJson("/api/admin/users/{$user->id}/unlock")->assertOk();

        $this->assertNull($user->refresh()->locked_until);
        $this->assertDatabaseHas('audit_logs', ['action' => 'user.unlocked', 'target_id' => $user->id]);
    }

    public function test_suspended_accounts_still_cannot_sign_in(): void
    {
        $user = User::factory()->create(['email' => 'suspended@tangaza.test', 'is_suspended' => true]);

        $this->attemptLogin($user->email, 'password')->assertStatus(422);
        $this->assertGuest();
    }
}
