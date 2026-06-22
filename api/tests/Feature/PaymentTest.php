<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_creating_a_booking_opens_a_pending_payment_and_does_not_confirm(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create(['price_per_day' => 1000]);

        $response = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-30',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'pending');
        $response->assertJsonPath('payment.status', 'pending');
        $response->assertJsonPath('payment.amount', 30000);

        $this->assertDatabaseHas('payments', [
            'reference' => $response->json('payment.reference'),
            'status' => 'pending',
            'amount' => 30000,
        ]);
    }

    public function test_verifying_a_payment_confirms_the_booking(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create(['price_per_day' => 1000]);

        $reference = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-30',
        ])->json('payment.reference');

        $response = $this->actingAs($customer)->postJson("/api/payments/{$reference}/verify", [
            'success' => true,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'confirmed');
        $response->assertJsonPath('payment.status', 'success');

        $this->assertDatabaseHas('bookings', [
            'billboard_id' => $billboard->id,
            'status' => 'confirmed',
        ]);
    }

    public function test_a_declined_payment_leaves_the_booking_pending(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create();

        $reference = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-30',
        ])->json('payment.reference');

        $response = $this->actingAs($customer)->postJson("/api/payments/{$reference}/verify", [
            'success' => false,
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.status', 'pending');
        $response->assertJsonPath('payment.status', 'failed');
    }

    public function test_payment_is_declined_if_the_dates_get_taken_before_verification(): void
    {
        $customer = User::factory()->create();
        $billboard = Billboard::factory()->create();

        $reference = $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-01',
            'end_date' => '2026-07-30',
        ])->json('payment.reference');

        // Someone else's booking is confirmed for overlapping dates mid-checkout.
        Booking::factory()->create([
            'billboard_id' => $billboard->id,
            'start_date' => '2026-07-15',
            'end_date' => '2026-08-15',
            'status' => BookingStatus::Confirmed,
        ]);

        $response = $this->actingAs($customer)->postJson("/api/payments/{$reference}/verify", [
            'success' => true,
        ]);

        $response->assertUnprocessable();
        $response->assertJsonValidationErrors('reference');
    }

    public function test_a_customer_cannot_verify_a_payment_for_a_booking_that_isnt_theirs(): void
    {
        $intruder = User::factory()->create();
        $booking = Booking::factory()->create(['status' => BookingStatus::Pending]);
        $payment = Payment::factory()->create([
            'booking_id' => $booking->id,
            'amount' => $booking->total_price,
        ]);

        $response = $this->actingAs($intruder)->postJson("/api/payments/{$payment->reference}/verify", [
            'success' => true,
        ]);

        $response->assertForbidden();
    }
}
