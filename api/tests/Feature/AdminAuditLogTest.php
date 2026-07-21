<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class AdminAuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_privileged_actions_are_recorded_with_actor_target_and_diff(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Ada Admin']);
        $target = User::factory()->create(['name' => 'Bob Customer']);

        $this->actingAs($admin)->patchJson("/api/admin/users/{$target->id}/toggle-suspension")->assertOk();

        $log = AuditLog::latest('id')->first();
        $this->assertSame('user.suspended', $log->action);
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertSame('Ada Admin', $log->actor_name);
        $this->assertSame('User', $log->target_type);
        $this->assertSame($target->id, $log->target_id);
        $this->assertSame('Bob Customer', $log->target_label);
        // The diff records the transition, not the whole record.
        $this->assertSame(['from' => false, 'to' => true], $log->changes['is_suspended']);
        $this->assertNotNull($log->ip_address);
    }

    public function test_audit_entries_cannot_be_modified_or_deleted(): void
    {
        $admin = User::factory()->admin()->create();
        $target = User::factory()->create();
        $this->actingAs($admin)->patchJson("/api/admin/users/{$target->id}/toggle-suspension")->assertOk();

        $log = AuditLog::latest('id')->first();

        try {
            $log->update(['action' => 'something.harmless']);
            $this->fail('Audit log entries must not be updatable.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('immutable', $exception->getMessage());
        }

        try {
            $log->delete();
            $this->fail('Audit log entries must not be deletable.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('immutable', $exception->getMessage());
        }

        // Untouched on disk.
        $this->assertDatabaseHas('audit_logs', ['id' => $log->id, 'action' => 'user.suspended']);
    }

    public function test_the_trail_is_readable_filterable_and_paginated(): void
    {
        $admin = User::factory()->admin()->create();
        $targets = User::factory()->count(3)->create();
        foreach ($targets as $target) {
            $this->actingAs($admin)->patchJson("/api/admin/users/{$target->id}/toggle-suspension")->assertOk();
        }

        $response = $this->actingAs($admin)->getJson('/api/admin/audit-logs?per_page=2');
        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('meta.total', 3);
        $this->assertContains('user.suspended', $response->json('actions'));

        $filtered = $this->actingAs($admin)->getJson('/api/admin/audit-logs?action=nothing.matches');
        $filtered->assertOk()->assertJsonCount(0, 'data');

        $searched = $this->actingAs($admin)->getJson('/api/admin/audit-logs?search='.urlencode($targets->first()->name));
        $searched->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_there_is_no_endpoint_that_writes_or_removes_audit_entries(): void
    {
        $admin = User::factory()->admin()->create();

        // Whether the router answers 404 or 405 doesn't matter — what matters
        // is that no request can create or remove a trail entry.
        $this->assertGreaterThanOrEqual(
            400,
            $this->actingAs($admin)->postJson('/api/admin/audit-logs', ['action' => 'forged'])->getStatusCode(),
        );
        $this->assertGreaterThanOrEqual(
            400,
            $this->actingAs($admin)->deleteJson('/api/admin/audit-logs/1')->getStatusCode(),
        );
        $this->assertSame(0, AuditLog::count());
    }
}
