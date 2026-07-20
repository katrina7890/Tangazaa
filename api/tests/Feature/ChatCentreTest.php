<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChatCentreTest extends TestCase
{
    use RefreshDatabase;

    private function bookingFor(User $owner, ?User $customer = null): Booking
    {
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        return Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'customer_id' => $customer?->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_partner_and_customer_exchange_messages_with_notifications_both_ways(): void
    {
        Storage::fake('public');
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->bookingFor($owner, $customer);

        $sent = $this->actingAs($owner)->post("/api/partner/bookings/{$booking->id}/messages", [
            'body' => 'Artwork proof attached — thoughts?',
            'attachments' => [UploadedFile::fake()->image('proof.jpg')],
        ]);
        $sent->assertCreated();
        $this->assertCount(1, $sent->json('data.attachments'));
        $this->assertDatabaseHas('app_notifications', ['user_id' => $customer->id, 'type' => 'chat.message']);

        $reply = $this->actingAs($customer)->postJson("/api/bookings/{$booking->id}/messages", [
            'body' => 'Love it — go ahead!',
        ]);
        $reply->assertCreated();
        $reply->assertJsonPath('data.from_customer', true);
        $this->assertDatabaseHas('app_notifications', ['user_id' => $owner->id, 'type' => 'chat.message']);

        $thread = $this->actingAs($owner)->getJson("/api/partner/bookings/{$booking->id}/messages");
        $thread->assertOk();
        $thread->assertJsonCount(2, 'data');
        // Bubble alignment: the customer's reply is not "mine" for the partner.
        $this->assertFalse($thread->json('data.1.mine'));
        $this->assertTrue($thread->json('data.0.mine'));
    }

    public function test_the_chat_centre_lists_conversations_with_the_latest_message(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        $booking = $this->bookingFor($owner, User::factory()->create());
        $this->bookingFor($owner); // quiet offline-style thread, no messages

        $this->actingAs($staff)->postJson("/api/partner/bookings/{$booking->id}/messages", [
            'body' => 'Called the client, artwork due Friday.',
        ])->assertCreated();

        $response = $this->actingAs($owner)->getJson('/api/partner/chats');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.booking_id', $booking->id);
        $response->assertJsonPath('data.0.latest.body', 'Called the client, artwork due Friday.');
        $response->assertJsonPath('data.0.messages_count', 1);
    }

    public function test_strangers_are_locked_out_of_threads(): void
    {
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->bookingFor($owner, $customer);

        $intruder = User::factory()->owner()->create();
        $this->actingAs($intruder)->getJson("/api/partner/bookings/{$booking->id}/messages")->assertForbidden();

        $nosyCustomer = User::factory()->create();
        $this->actingAs($nosyCustomer)->getJson("/api/bookings/{$booking->id}/messages")->assertForbidden();
        $this->actingAs($nosyCustomer)->postJson("/api/bookings/{$booking->id}/messages", ['body' => 'hi'])->assertForbidden();
    }

    public function test_a_message_needs_a_body_or_an_attachment(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = $this->bookingFor($owner);

        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/messages", [])
            ->assertJsonValidationErrors('body');
    }
}
