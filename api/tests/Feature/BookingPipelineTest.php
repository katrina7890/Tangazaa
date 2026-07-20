<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BookingPipelineTest extends TestCase
{
    use RefreshDatabase;

    private function confirmedBooking(User $owner, array $attributes = []): Booking
    {
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        return Booking::factory()->create(array_merge([
            'billboard_id' => $billboard->id,
            'status' => 'confirmed',
        ], $attributes));
    }

    public function test_the_pipeline_lists_all_seven_stages_with_confirmed_auto_completed(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = $this->confirmedBooking($owner);

        $response = $this->actingAs($owner)->getJson("/api/partner/bookings/{$booking->id}/pipeline");

        $response->assertOk();
        $response->assertJsonCount(7, 'stages');
        $response->assertJsonPath('stages.0.stage', 'confirmed');
        $this->assertNotNull($response->json('stages.0.completed_at'));
        $this->assertNull($response->json('stages.1.completed_at'));
        $this->assertNotEmpty($response->json('team'));
    }

    public function test_completing_a_stage_cascades_earlier_stages_and_notifies_the_client(): void
    {
        Storage::fake('public');
        $owner = User::factory()->owner()->create();
        $customer = User::factory()->create();
        $booking = $this->confirmedBooking($owner, ['customer_id' => $customer->id]);

        $response = $this->actingAs($owner)->post(
            "/api/partner/bookings/{$booking->id}/pipeline/installed",
            [
                'completed' => '1',
                'note' => 'Crew finished at 11am.',
                'photos' => [UploadedFile::fake()->image('install.jpg')],
            ],
        );

        $response->assertOk();
        $stages = collect($response->json('stages'))->keyBy('stage');
        $this->assertNotNull($stages['installed']['completed_at']);
        $this->assertCount(1, $stages['installed']['photos']);
        // Earlier stages were pulled along; later ones stayed open.
        $this->assertNotNull($stages['artwork']['completed_at']);
        $this->assertNotNull($stages['printing']['completed_at']);
        $this->assertNull($stages['campaign_active']['completed_at']);

        $this->assertDatabaseHas('app_notifications', [
            'user_id' => $customer->id,
            'type' => 'booking.stage',
        ]);
    }

    public function test_reopening_a_stage_reopens_everything_after_it(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = $this->confirmedBooking($owner);

        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/pipeline/installed", ['completed' => true])
            ->assertOk();
        $response = $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/pipeline/printing", ['completed' => false]);

        $stages = collect($response->json('stages'))->keyBy('stage');
        $this->assertNull($stages['printing']['completed_at']);
        $this->assertNull($stages['installed']['completed_at']);
        $this->assertNotNull($stages['artwork']['completed_at']);
    }

    public function test_substatus_and_assignee_are_validated(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        $booking = $this->confirmedBooking($owner);

        // Valid: an artwork sub-status plus a workspace member.
        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/pipeline/artwork", [
            'substatus' => 'provider_designing',
            'assigned_to' => $staff->id,
        ])->assertOk();

        // Invalid sub-status for the stage.
        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/pipeline/artwork", [
            'substatus' => 'client_printing',
        ])->assertJsonValidationErrors('substatus');

        // A user outside the workspace can't be assigned.
        $stranger = User::factory()->owner()->create();
        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/pipeline/artwork", [
            'assigned_to' => $stranger->id,
        ])->assertJsonValidationErrors('assigned_to');
    }

    public function test_offline_deals_have_no_payment_release_stage_and_strangers_are_locked_out(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = $this->confirmedBooking($owner, ['source' => 'offline', 'customer_id' => null]);

        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/pipeline/payment_released", ['completed' => true])
            ->assertJsonValidationErrors('stage');

        $intruder = User::factory()->owner()->create();
        $this->actingAs($intruder)->getJson("/api/partner/bookings/{$booking->id}/pipeline")->assertForbidden();
        $this->actingAs($intruder)->postJson("/api/partner/bookings/{$booking->id}/pipeline/installed", ['completed' => true])
            ->assertForbidden();
    }

    public function test_reminders_flag_overdue_artwork_ending_campaigns_and_payout(): void
    {
        $owner = User::factory()->owner()->create();

        // Starts in 3 days, artwork untouched → artwork overdue.
        $this->confirmedBooking($owner, [
            'start_date' => Carbon::today()->addDays(3),
            'end_date' => Carbon::today()->addDays(40),
        ]);
        // Ended app booking with no payout released → payment_release.
        $this->confirmedBooking($owner, [
            'start_date' => Carbon::today()->subDays(40),
            'end_date' => Carbon::today()->subDays(5),
        ]);

        $response = $this->actingAs($owner)->getJson('/api/partner/reminders');

        $response->assertOk();
        $types = collect($response->json('data'))->pluck('type');
        $this->assertTrue($types->contains('artwork_overdue'));
        $this->assertTrue($types->contains('payment_release'));
    }

    public function test_the_partner_booking_detail_endpoint_returns_payments_and_stages(): void
    {
        $owner = User::factory()->owner()->create();
        $booking = $this->confirmedBooking($owner);
        $this->actingAs($owner)->postJson("/api/partner/bookings/{$booking->id}/pipeline/artwork", ['completed' => true]);

        $response = $this->actingAs($owner)->getJson("/api/partner/bookings/{$booking->id}");

        $response->assertOk();
        $response->assertJsonPath('data.id', $booking->id);
        $this->assertIsArray($response->json('payments'));
        $this->assertNotEmpty($response->json('data.stages'));
    }
}
