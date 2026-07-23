<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Models\Billboard;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PaymentChannelTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_the_chosen_channel_is_recorded_on_the_payment(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();

        $this->actingAs($customer)
            ->postJson('/api/bookings', $this->payload($billboard, ['channel' => 'mpesa']))
            ->assertCreated()
            ->assertJsonPath('payment.channel', 'mpesa');
    }

    public function test_it_defaults_to_card_when_no_channel_is_given(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();

        // Existing callers omit the field entirely — they must keep working.
        $this->actingAs($customer)
            ->postJson('/api/bookings', $this->payload($billboard))
            ->assertCreated()
            ->assertJsonPath('payment.channel', 'card');
    }

    public function test_an_unknown_channel_is_rejected(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();

        $this->actingAs($customer)
            ->postJson('/api/bookings', $this->payload($billboard, ['channel' => 'bitcoin']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('channel');
    }

    public function test_resuming_checkout_reuses_the_payment_but_honours_a_new_channel(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();

        $created = $this->actingAs($customer)
            ->postJson('/api/bookings', $this->payload($billboard, ['channel' => 'card']))
            ->assertCreated();

        $bookingId = $created->json('data.id');
        $reference = $created->json('payment.reference');

        $resumed = $this->actingAs($customer)
            ->postJson("/api/bookings/{$bookingId}/pay", ['channel' => 'mpesa'])
            ->assertOk();

        // Same transaction, switched rail — not a duplicate payment row.
        $this->assertSame($reference, $resumed->json('data.reference'));
        $this->assertSame('mpesa', $resumed->json('data.channel'));
        $this->assertSame(1, Payment::where('booking_id', $bookingId)->count());
    }

    public function test_the_channel_does_not_change_what_is_charged(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();

        $response = $this->actingAs($customer)
            ->postJson('/api/bookings', $this->payload($billboard, ['channel' => 'mpesa']))
            ->assertCreated();

        // No service fee anywhere in the chain: the payment must equal
        // days x daily rate, which is what the receipt and contract show.
        $expected = 41 * $billboard->price_per_day;
        $this->assertSame($expected, $response->json('data.total_price'));
        $this->assertSame($expected, $response->json('payment.amount'));
        $this->assertSame(PaymentStatus::Pending->value, $response->json('payment.status'));
    }

    private function payload(Billboard $billboard, array $extra = []): array
    {
        return array_merge([
            'billboard_id' => $billboard->id,
            'start_date' => now()->addDays(40)->toDateString(),
            'end_date' => now()->addDays(80)->toDateString(),
        ], $extra);
    }

    /** @return array{0: User, 1: Billboard} */
    private function customerAndBillboard(): array
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $owner = User::factory()->create(['role' => UserRole::Owner]);
        $billboard = Billboard::factory()->for($owner, 'owner')->create([
            'is_active' => true,
            'available_from' => null,
        ]);

        return [$customer, $billboard];
    }
}
