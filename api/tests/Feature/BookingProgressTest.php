<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\BookingUpdate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BookingProgressTest extends TestCase
{
    use RefreshDatabase;

    private function bookingFor(User $owner, ?User $customer = null): Booking
    {
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        return Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'customer_id' => ($customer ?? User::factory()->create())->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_an_owner_can_post_a_progress_update_with_photos_and_the_customer_is_notified(): void
    {
        Storage::fake('public');
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->bookingFor($owner, $customer);

        $response = $this->actingAs($owner)->post("/api/partner/bookings/{$booking->id}/updates", [
            'stage' => 'installation',
            'message' => 'The crew is on site — going up now!',
            'photos' => [UploadedFile::fake()->image('site.jpg')],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.stage', 'installation');
        $this->assertCount(1, $response->json('data.photos'));

        $update = BookingUpdate::first();
        Storage::disk('public')->assertExists($update->photos[0]);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $customer->id,
            'type' => 'campaign.update',
        ]);
    }

    public function test_staff_can_post_updates_on_their_employers_bookings(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        $booking = $this->bookingFor($owner);

        $this->actingAs($staff)->postJson("/api/partner/bookings/{$booking->id}/updates", [
            'stage' => 'agent_contact',
            'message' => 'Called the client to kick things off.',
        ])->assertCreated();
    }

    public function test_an_owner_cannot_post_updates_on_another_owners_booking(): void
    {
        $owner = User::factory()->owner()->create();
        $intruder = User::factory()->owner()->create();
        $booking = $this->bookingFor($owner);

        $this->actingAs($intruder)->postJson("/api/partner/bookings/{$booking->id}/updates", [
            'stage' => 'artwork',
            'message' => 'Sneaky update.',
        ])->assertForbidden();
    }

    public function test_an_update_needs_a_message_or_a_photo(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = $this->bookingFor($owner);

        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/updates", [
            'stage' => 'artwork',
        ])->assertJsonValidationErrors('message');
    }

    public function test_a_customer_sees_the_progress_timeline_for_their_own_booking_only(): void
    {
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->bookingFor($owner, $customer);
        BookingUpdate::factory()->count(2)->create(['booking_id' => $booking->id, 'user_id' => $owner->id]);

        $response = $this->actingAs($customer)->getJson("/api/bookings/{$booking->id}/updates");
        $response->assertOk();
        $response->assertJsonCount(2, 'data');

        $stranger = User::factory()->create();
        $this->actingAs($stranger)->getJson("/api/bookings/{$booking->id}/updates")->assertForbidden();
    }

    public function test_a_customer_can_approve_a_go_ahead_request_and_the_owner_is_notified(): void
    {
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->bookingFor($owner, $customer);
        $update = BookingUpdate::factory()->needsApproval()->create([
            'booking_id' => $booking->id,
            'stage' => 'production',
            'message' => 'Artwork is final — good to print and install?',
        ]);

        $response = $this->actingAs($customer)->patchJson("/api/booking-updates/{$update->id}/react", [
            'reaction' => 'approved',
            'comment' => 'Love it, go ahead!',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.client_reaction', 'approved');
        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $owner->id,
            'type' => 'campaign.reaction',
        ]);
    }

    public function test_approval_reactions_are_only_valid_where_they_make_sense(): void
    {
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->bookingFor($owner, $customer);

        $plain = BookingUpdate::factory()->create(['booking_id' => $booking->id]);
        $this->actingAs($customer)->patchJson("/api/booking-updates/{$plain->id}/react", [
            'reaction' => 'approved',
        ])->assertJsonValidationErrors('reaction');

        $askingApproval = BookingUpdate::factory()->needsApproval()->create(['booking_id' => $booking->id]);
        $this->actingAs($customer)->patchJson("/api/booking-updates/{$askingApproval->id}/react", [
            'reaction' => 'liked',
        ])->assertJsonValidationErrors('reaction');
    }

    public function test_a_customer_cannot_react_to_updates_on_someone_elses_booking(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = $this->bookingFor($owner);
        $update = BookingUpdate::factory()->create(['booking_id' => $booking->id]);

        $stranger = User::factory()->create();
        $this->actingAs($stranger)->patchJson("/api/booking-updates/{$update->id}/react", [
            'reaction' => 'liked',
        ])->assertForbidden();
    }

    public function test_my_bookings_reports_unanswered_approval_requests(): void
    {
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->bookingFor($owner, $customer);
        BookingUpdate::factory()->create(['booking_id' => $booking->id]);
        // Posted last, so it's the booking's latestUpdate.
        BookingUpdate::factory()->needsApproval()->create(['booking_id' => $booking->id, 'stage' => 'production']);

        $response = $this->actingAs($customer)->getJson('/api/my/bookings');
        $response->assertOk();
        $response->assertJsonPath('data.0.updates_count', 2);
        $response->assertJsonPath('data.0.pending_approvals', 1);
        $response->assertJsonPath('data.0.latest_update.stage', 'production');
    }

    public function test_deleting_an_update_removes_its_stored_photos(): void
    {
        Storage::fake('public');
        $owner = User::factory()->owner()->create();
        $booking = $this->bookingFor($owner);

        $created = $this->actingAs($owner)->post("/api/partner/bookings/{$booking->id}/updates", [
            'stage' => 'installation',
            'photos' => [UploadedFile::fake()->image('up.jpg')],
        ])->assertCreated();

        $update = BookingUpdate::first();
        $path = $update->photos[0];

        $this->actingAs($owner)->deleteJson("/api/partner/booking-updates/{$update->id}")->assertNoContent();
        Storage::disk('public')->assertMissing($path);
        $this->assertDatabaseCount('booking_updates', 0);
    }
}
