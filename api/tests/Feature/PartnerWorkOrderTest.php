<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerWorkOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_owner_can_create_a_work_order_for_their_billboard(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->postJson('/api/partner/work-orders', [
            'billboard_id' => $billboard->id,
            'type' => 'installation',
            'assignee_name' => 'Kevin M.',
            'scheduled_for' => now()->addDays(3)->toDateString(),
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.type', 'installation');
        $response->assertJsonPath('data.status', 'pending');
        $response->assertJsonPath('data.billboard.title', $billboard->title);
    }

    public function test_a_work_order_cannot_target_another_owners_billboard(): void
    {
        $owner = User::factory()->owner()->create();
        $foreignBillboard = Billboard::factory()->create();

        $this->actingAs($owner)->postJson('/api/partner/work-orders', [
            'billboard_id' => $foreignBillboard->id,
            'type' => 'printing',
        ])->assertJsonValidationErrors('billboard_id');
    }

    public function test_completing_a_work_order_stamps_completed_at(): void
    {
        $owner = User::factory()->owner()->create();
        $workOrder = WorkOrder::factory()->create([
            'owner_id' => $owner->id,
            'billboard_id' => Billboard::factory()->create(['owner_id' => $owner->id])->id,
        ]);

        $response = $this->actingAs($owner)
            ->patchJson("/api/partner/work-orders/{$workOrder->id}", ['status' => 'completed']);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'completed');
        $this->assertNotNull($workOrder->fresh()->completed_at);

        // Re-opening the job clears the completion stamp again.
        $this->actingAs($owner)
            ->patchJson("/api/partner/work-orders/{$workOrder->id}", ['status' => 'in_progress'])
            ->assertOk();
        $this->assertNull($workOrder->fresh()->completed_at);
    }

    public function test_work_orders_can_be_filtered_by_status_and_type(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        WorkOrder::factory()->create([
            'owner_id' => $owner->id, 'billboard_id' => $billboard->id, 'type' => 'printing',
        ]);
        WorkOrder::factory()->completed()->create([
            'owner_id' => $owner->id, 'billboard_id' => $billboard->id, 'type' => 'installation',
        ]);

        $this->actingAs($owner)->getJson('/api/partner/work-orders?status=pending')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'printing');

        $this->actingAs($owner)->getJson('/api/partner/work-orders?type=installation')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'completed');
    }

    public function test_an_owner_cannot_touch_another_owners_work_order(): void
    {
        $owner = User::factory()->owner()->create();
        $foreign = WorkOrder::factory()->create();

        $this->actingAs($owner)
            ->patchJson("/api/partner/work-orders/{$foreign->id}", ['status' => 'completed'])
            ->assertForbidden();
    }
}
