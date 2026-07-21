<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CustomerDocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_confirmed_booking_lists_a_contract_and_a_receipt(): void
    {
        [$customer, $booking] = $this->confirmedBookingWithPayment();

        $response = $this->actingAs($customer)->getJson('/api/my/documents')->assertOk();

        $types = array_column($response->json('data'), 'type');
        $this->assertContains('contract', $types);
        $this->assertContains('receipt', $types);
    }

    public function test_a_pending_booking_has_no_contract_yet(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $this->bookingFor($customer, BookingStatus::Pending);

        $this->actingAs($customer)
            ->getJson('/api/my/documents')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_the_contract_downloads_as_a_pdf(): void
    {
        [$customer, $booking] = $this->confirmedBookingWithPayment();

        $response = $this->actingAs($customer)
            ->get("/api/bookings/{$booking->id}/documents/contract")
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf');

        // A real PDF, not an error page rendered with the wrong header.
        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_the_receipt_downloads_as_a_pdf(): void
    {
        [$customer, $booking] = $this->confirmedBookingWithPayment();
        $reference = $booking->payments()->first()->reference;

        $response = $this->actingAs($customer)
            ->get("/api/payments/{$reference}/receipt")
            ->assertOk();

        $this->assertStringStartsWith('%PDF', $response->getContent());
    }

    public function test_another_customer_cannot_download_your_contract(): void
    {
        [, $booking] = $this->confirmedBookingWithPayment();
        $intruder = User::factory()->create(['role' => UserRole::Customer]);

        $this->actingAs($intruder)
            ->get("/api/bookings/{$booking->id}/documents/contract")
            ->assertForbidden();
    }

    public function test_another_customer_cannot_download_your_receipt(): void
    {
        [, $booking] = $this->confirmedBookingWithPayment();
        $reference = $booking->payments()->first()->reference;
        $intruder = User::factory()->create(['role' => UserRole::Customer]);

        $this->actingAs($intruder)
            ->get("/api/payments/{$reference}/receipt")
            ->assertForbidden();
    }

    public function test_documents_require_authentication(): void
    {
        $this->getJson('/api/my/documents')->assertUnauthorized();
    }

    public function test_a_customer_only_sees_their_own_paperwork(): void
    {
        $this->confirmedBookingWithPayment();
        $other = User::factory()->create(['role' => UserRole::Customer]);

        $this->actingAs($other)
            ->getJson('/api/my/documents')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    /** @return array{0: User, 1: Booking} */
    private function confirmedBookingWithPayment(): array
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $booking = $this->bookingFor($customer, BookingStatus::Confirmed);

        Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'TGZ-'.strtoupper(fake()->bothify('??????######')),
            'amount' => $booking->total_price,
            'email' => $customer->email,
            'channel' => 'card',
            'status' => PaymentStatus::Success,
            'paid_at' => now(),
        ]);

        return [$customer, $booking];
    }

    private function bookingFor(User $customer, BookingStatus $status): Booking
    {
        $owner = User::factory()->create(['role' => UserRole::Owner]);
        $billboard = Billboard::factory()->for($owner, 'owner')->create();

        return Booking::create([
            'billboard_id' => $billboard->id,
            'customer_id' => $customer->id,
            'start_date' => now()->addDays(40),
            'end_date' => now()->addDays(80),
            'total_price' => 410_000,
            'status' => $status,
        ]);
    }
}
