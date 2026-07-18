<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class PartnerTeamTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_owner_can_create_and_list_staff_accounts(): void
    {
        $owner = User::factory()->owner()->create(['company_name' => 'Nairobi Outdoor Media']);

        $response = $this->actingAs($owner)->postJson('/api/partner/team', [
            'name' => 'Kevin Installer',
            'email' => 'kevin@nairobioutdoor.co.ke',
            'password' => 'secret-password',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('users', [
            'email' => 'kevin@nairobioutdoor.co.ke',
            'role' => 'staff',
            'employer_id' => $owner->id,
            'company_name' => 'Nairobi Outdoor Media',
        ]);

        $list = $this->actingAs($owner)->getJson('/api/partner/team');
        $list->assertOk();
        $list->assertJsonCount(1, 'data');
        $list->assertJsonPath('data.0.email', 'kevin@nairobioutdoor.co.ke');
    }

    public function test_a_new_staff_member_can_log_in_with_their_own_credentials(): void
    {
        $owner = User::factory()->owner()->create();

        $this->actingAs($owner)->postJson('/api/partner/team', [
            'name' => 'Kevin Installer',
            'email' => 'kevin@example.com',
            'password' => 'secret-password',
        ])->assertCreated();

        // Mixing actingAs() with a real /api/login in one test reads Sanctum's
        // cached RequestGuard (see CLAUDE.md), so assert the credential works
        // against the web guard directly — proving the password was hashed
        // correctly on creation.
        $this->assertTrue(Auth::guard('web')->attempt([
            'email' => 'kevin@example.com',
            'password' => 'secret-password',
        ]));
        $this->assertSame('staff', Auth::guard('web')->user()->role->value);
    }

    public function test_the_team_list_only_shows_your_own_staff(): void
    {
        $owner = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        User::factory()->staffOf($owner)->create();
        User::factory()->staffOf($otherOwner)->count(2)->create();

        $response = $this->actingAs($owner)->getJson('/api/partner/team');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
    }

    public function test_an_owner_cannot_remove_another_companys_staff_or_non_staff_users(): void
    {
        $owner = User::factory()->owner()->create();
        $otherOwner = User::factory()->owner()->create();
        $otherStaff = User::factory()->staffOf($otherOwner)->create();
        $customer = User::factory()->create();

        $this->actingAs($owner)->deleteJson("/api/partner/team/{$otherStaff->id}")->assertForbidden();
        $this->actingAs($owner)->deleteJson("/api/partner/team/{$customer->id}")->assertForbidden();
    }

    public function test_an_owner_can_remove_their_own_staff(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();

        $this->actingAs($owner)->deleteJson("/api/partner/team/{$staff->id}")->assertNoContent();
        $this->assertDatabaseMissing('users', ['id' => $staff->id]);
    }

    public function test_duplicate_staff_email_is_rejected(): void
    {
        $owner = User::factory()->owner()->create();
        $existing = User::factory()->create();

        $this->actingAs($owner)->postJson('/api/partner/team', [
            'name' => 'Dup',
            'email' => $existing->email,
            'password' => 'secret-password',
        ])->assertJsonValidationErrors('email');
    }
}
