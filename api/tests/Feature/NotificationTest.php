<?php

namespace Tests\Feature;

use App\Models\AppNotification;
use App\Models\Billboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_new_booking_request_notifies_the_billboard_owner(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $customer = User::factory()->create();

        $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->addDay()->toDateString(),
            'end_date' => Carbon::today()->addDays(30)->toDateString(),
        ])->assertCreated();

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $owner->id,
            'type' => 'booking.requested',
        ]);
    }

    public function test_a_successful_payment_notifies_the_billboard_owner(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $customer = User::factory()->create();

        $booking = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->addDay()->toDateString(),
            'end_date' => Carbon::today()->addDays(30)->toDateString(),
        ])->json();

        $this->actingAs($customer)
            ->postJson("/api/payments/{$booking['payment']['reference']}/verify", ['success' => true])
            ->assertOk();

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $owner->id,
            'type' => 'booking.paid',
        ]);
    }

    public function test_a_user_sees_their_notifications_and_unread_count(): void
    {
        $owner = User::factory()->owner()->create();
        AppNotification::factory()->count(2)->create(['user_id' => $owner->id]);
        AppNotification::factory()->read()->create(['user_id' => $owner->id]);
        AppNotification::factory()->create(); // someone else's

        $response = $this->actingAs($owner)->getJson('/api/notifications');

        $response->assertOk();
        $response->assertJsonCount(3, 'data');
        $this->assertSame(2, $response->json('unread_count'));
    }

    public function test_a_user_can_mark_a_notification_read_but_not_someone_elses(): void
    {
        $owner = User::factory()->owner()->create();
        $mine = AppNotification::factory()->create(['user_id' => $owner->id]);
        $theirs = AppNotification::factory()->create();

        $this->actingAs($owner)
            ->patchJson("/api/notifications/{$mine->id}/read")
            ->assertOk();
        $this->assertNotNull($mine->fresh()->read_at);

        $this->actingAs($owner)
            ->patchJson("/api/notifications/{$theirs->id}/read")
            ->assertForbidden();
    }

    public function test_a_user_can_mark_all_notifications_read(): void
    {
        $owner = User::factory()->owner()->create();
        AppNotification::factory()->count(3)->create(['user_id' => $owner->id]);

        $this->actingAs($owner)->patchJson('/api/notifications/read-all')->assertOk();

        $this->assertSame(0, $owner->appNotifications()->whereNull('read_at')->count());
    }
}
