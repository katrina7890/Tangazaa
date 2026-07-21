<?php

namespace Tests\Feature;

use App\Enums\AdminPermission;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_admin_without_a_permission_is_refused_that_endpoint(): void
    {
        // Support-desk admin: may read users, may not manage them.
        $support = User::factory()->limitedAdmin([AdminPermission::UsersView])->create();
        $target = User::factory()->create();

        $this->actingAs($support)->getJson('/api/admin/users')->assertOk();
        $this->actingAs($support)->patchJson("/api/admin/users/{$target->id}/toggle-suspension")->assertForbidden();

        // And nothing about audit or other admins is reachable.
        $this->actingAs($support)->getJson('/api/admin/audit-logs')->assertForbidden();
        $this->actingAs($support)->getJson('/api/admin/admins')->assertForbidden();
        $this->assertFalse($target->refresh()->is_suspended);
    }

    public function test_a_super_admin_holds_every_permission_implicitly(): void
    {
        $superAdmin = User::factory()->admin()->create();
        $target = User::factory()->create();

        $this->actingAs($superAdmin)->getJson('/api/admin/users')->assertOk();
        $this->actingAs($superAdmin)->getJson('/api/admin/audit-logs')->assertOk();
        $this->actingAs($superAdmin)->patchJson("/api/admin/users/{$target->id}/toggle-suspension")->assertOk();
    }

    public function test_non_admins_cannot_reach_the_console_at_all(): void
    {
        foreach ([User::factory()->create(), User::factory()->owner()->create()] as $user) {
            $this->actingAs($user)->getJson('/api/admin/users')->assertForbidden();
            $this->actingAs($user)->getJson('/api/admin/security')->assertForbidden();
        }
    }

    /**
     * Separate test on purpose: Sanctum's RequestGuard caches its resolved
     * user for the guard's lifetime, so a guest assertion after an actingAs()
     * in the same method reads the stale user (see CLAUDE.md).
     */
    public function test_guests_are_rejected_from_the_console(): void
    {
        $this->getJson('/api/admin/users')->assertUnauthorized();
        $this->getJson('/api/admin/audit-logs')->assertUnauthorized();
    }

    public function test_only_super_admins_can_grant_permissions(): void
    {
        // Holding admins.manage is enough to *read* the roster...
        $manager = User::factory()->limitedAdmin([AdminPermission::AdminsManage])->create();
        $other = User::factory()->limitedAdmin([AdminPermission::UsersView])->create();

        $this->actingAs($manager)->getJson('/api/admin/admins')->assertOk();

        // ...but not to grant power to anyone, including themselves.
        $this->actingAs($manager)->patchJson("/api/admin/admins/{$other->id}/permissions", [
            'permissions' => [AdminPermission::FinanceManage->value],
        ])->assertForbidden();

        $this->assertSame([AdminPermission::UsersView->value], $other->refresh()->admin_permissions);
    }

    public function test_a_super_admin_can_create_an_admin_and_set_permissions(): void
    {
        $superAdmin = User::factory()->admin()->create();

        $created = $this->actingAs($superAdmin)->postJson('/api/admin/admins', [
            'name' => 'New Admin',
            'email' => 'new.admin@tangaza.test',
            'password' => 'correct-horse-battery-99!',
            'permissions' => [AdminPermission::UsersView->value],
        ]);

        $created->assertCreated();
        $created->assertJsonPath('data.is_super_admin', false);
        $created->assertJsonPath('data.permissions.0', 'users.view');
        $this->assertDatabaseHas('audit_logs', ['action' => 'admin.created']);

        $adminId = $created->json('data.id');
        $this->actingAs($superAdmin)->patchJson("/api/admin/admins/{$adminId}/permissions", [
            'permissions' => [AdminPermission::UsersView->value, AdminPermission::FinanceView->value],
        ])->assertOk()->assertJsonCount(2, 'data.permissions');

        $this->assertDatabaseHas('audit_logs', ['action' => 'admin.permissions_changed']);
    }

    public function test_weak_or_breached_admin_passwords_are_rejected(): void
    {
        $superAdmin = User::factory()->admin()->create();

        $this->actingAs($superAdmin)->postJson('/api/admin/admins', [
            'name' => 'Weak Admin',
            'email' => 'weak@tangaza.test',
            'password' => 'password',
        ])->assertJsonValidationErrors('password');
    }

    public function test_a_super_admin_cannot_edit_their_own_access(): void
    {
        $superAdmin = User::factory()->admin()->create();

        $this->actingAs($superAdmin)->patchJson("/api/admin/admins/{$superAdmin->id}/permissions", [
            'permissions' => [],
        ])->assertStatus(422);

        $this->actingAs($superAdmin)->patchJson("/api/admin/admins/{$superAdmin->id}/super-admin", [
            'is_super_admin' => false,
        ])->assertStatus(422);
    }

    public function test_the_last_super_admin_cannot_be_demoted(): void
    {
        $first = User::factory()->admin()->create();
        $second = User::factory()->admin()->create();

        // Two exist, so demoting one is fine.
        $this->actingAs($second)->patchJson("/api/admin/admins/{$first->id}/super-admin", [
            'is_super_admin' => false,
        ])->assertOk();

        // `second` is now the only one left and cannot be demoted by `first`
        // (who no longer has the power) or by anyone else.
        $third = User::factory()->admin()->create();
        $this->actingAs($third)->patchJson("/api/admin/admins/{$second->id}/super-admin", [
            'is_super_admin' => false,
        ])->assertOk();

        $this->actingAs($third)->patchJson("/api/admin/admins/{$third->id}/super-admin", [
            'is_super_admin' => false,
        ])->assertStatus(422);
    }

    public function test_only_a_super_admin_can_suspend_another_administrator(): void
    {
        $manager = User::factory()->limitedAdmin([AdminPermission::UsersManage])->create();
        $victim = User::factory()->admin()->create();

        $this->actingAs($manager)->patchJson("/api/admin/users/{$victim->id}/toggle-suspension")
            ->assertForbidden();

        $this->assertFalse($victim->refresh()->is_suspended);
    }

    public function test_privileged_booking_actions_require_their_permission(): void
    {
        $viewer = User::factory()->limitedAdmin([AdminPermission::BookingsView])->create();
        $booking = Booking::factory()->create(['status' => 'confirmed']);

        $this->actingAs($viewer)->getJson('/api/admin/bookings')->assertOk();
        $this->actingAs($viewer)->patchJson("/api/admin/bookings/{$booking->id}/cancel")->assertForbidden();
        $this->assertSame('confirmed', $booking->refresh()->status->value);
    }
}
