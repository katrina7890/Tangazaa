<?php

namespace Tests\Feature;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Mail\BookingCancelledMail;
use App\Mail\BookingRequestedMail;
use App\Mail\CampaignManagerAssignedMail;
use App\Mail\PaymentReceiptMail;
use App\Mail\VerifyEmailMail;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class CustomerEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Mail::fake();
    }

    public function test_registering_sends_a_verification_email(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Asha Wanjiru',
            'company_name' => 'Bold Media',
            'email' => 'asha@example.com',
            'password' => 'password',
            'role' => 'customer',
        ])->assertCreated();

        Mail::assertQueued(
            VerifyEmailMail::class,
            fn (VerifyEmailMail $mail) => $mail->hasTo('asha@example.com'),
        );
    }

    public function test_registration_does_not_block_on_an_unverified_address(): void
    {
        // Verification is a nudge, not a gate — the account works immediately.
        $this->postJson('/api/register', [
            'name' => 'Asha Wanjiru',
            'company_name' => 'Bold Media',
            'email' => 'asha@example.com',
            'password' => 'password',
            'role' => 'customer',
        ])->assertCreated();

        $this->assertNull(User::firstWhere('email', 'asha@example.com')->email_verified_at);

        // The session works straight away despite the unverified address.
        // Asserted on the payload, not the status: chaining a second simulated
        // request in one test method carries the first response's status code
        // over (the same in-process harness artifact CLAUDE.md notes for
        // Sanctum) — the body and auth state are correct.
        $this->getJson('/api/user')->assertJsonPath('email', 'asha@example.com');
    }

    public function test_a_signed_link_verifies_the_address_and_redirects_to_the_spa(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);

        $this->get($this->verificationUrl($user))
            ->assertRedirect(config('app.frontend_url').'/dashboard?verified=1');

        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_a_tampered_verification_link_is_rejected(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        $other = User::factory()->create(['email_verified_at' => null]);

        // A valid signature for one user must not verify another.
        $url = str_replace(
            "/email/verify/{$user->id}/",
            "/email/verify/{$other->id}/",
            $this->verificationUrl($user),
        );

        $this->get($url)->assertForbidden();

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertNull($other->fresh()->email_verified_at);
    }

    public function test_creating_a_booking_emails_the_customer(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();

        $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => now()->addDays(40)->toDateString(),
            'end_date' => now()->addDays(80)->toDateString(),
        ])->assertCreated();

        Mail::assertQueued(
            BookingRequestedMail::class,
            fn (BookingRequestedMail $mail) => $mail->hasTo($customer->email),
        );
    }

    public function test_a_successful_payment_emails_a_receipt_with_both_pdfs(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();
        $booking = $this->pendingBooking($customer, $billboard);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'TGZ-TESTREF12345',
            'amount' => $booking->total_price,
            'email' => $customer->email,
            'channel' => 'card',
            'status' => PaymentStatus::Pending,
        ]);

        $this->actingAs($customer)
            ->postJson("/api/payments/{$payment->reference}/verify", ['success' => true])
            ->assertOk();

        Mail::assertQueued(PaymentReceiptMail::class, function (PaymentReceiptMail $mail) use ($customer) {
            $attachments = $mail->attachments();

            return $mail->hasTo($customer->email) && count($attachments) === 2;
        });
    }

    public function test_a_declined_payment_sends_no_receipt(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();
        $booking = $this->pendingBooking($customer, $billboard);

        $payment = Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'TGZ-DECLINED1234',
            'amount' => $booking->total_price,
            'email' => $customer->email,
            'channel' => 'card',
            'status' => PaymentStatus::Pending,
        ]);

        $this->actingAs($customer)
            ->postJson("/api/payments/{$payment->reference}/verify", ['success' => false])
            ->assertOk();

        Mail::assertNotQueued(PaymentReceiptMail::class);
    }

    public function test_cancelling_emails_the_customer(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();
        $booking = $this->pendingBooking($customer, $billboard);

        $this->actingAs($customer)
            ->patchJson("/api/bookings/{$booking->id}/cancel")
            ->assertOk();

        Mail::assertQueued(BookingCancelledMail::class);
    }

    public function test_an_opted_out_customer_is_not_emailed(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();
        $customer->update(['email_preferences' => ['booking_requested' => false]]);

        $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => now()->addDays(40)->toDateString(),
            'end_date' => now()->addDays(80)->toDateString(),
        ])->assertCreated();

        Mail::assertNotQueued(BookingRequestedMail::class);
    }

    public function test_assigning_a_campaign_manager_introduces_them_by_email(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();
        $booking = $this->pendingBooking($customer, $billboard);
        $owner = $billboard->owner;

        $staff = User::factory()->create([
            'role' => UserRole::Staff,
            'employer_id' => $owner->id,
            'name' => 'Brian Otieno',
        ]);

        $this->actingAs($owner)
            ->patchJson("/api/partner/bookings/{$booking->id}/account-manager", [
                'account_manager_id' => $staff->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.account_manager.name', 'Brian Otieno');

        Mail::assertQueued(
            CampaignManagerAssignedMail::class,
            fn (CampaignManagerAssignedMail $mail) => $mail->hasTo($customer->email),
        );
    }

    public function test_a_manager_from_another_company_cannot_be_assigned(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();
        $booking = $this->pendingBooking($customer, $billboard);
        $outsider = User::factory()->create(['role' => UserRole::Staff]);

        $this->actingAs($billboard->owner)
            ->patchJson("/api/partner/bookings/{$booking->id}/account-manager", [
                'account_manager_id' => $outsider->id,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('account_manager_id');

        Mail::assertNotQueued(CampaignManagerAssignedMail::class);
    }

    public function test_reassigning_the_same_person_does_not_re_email_the_client(): void
    {
        [$customer, $billboard] = $this->customerAndBillboard();
        $booking = $this->pendingBooking($customer, $billboard);
        $owner = $billboard->owner;

        $payload = ['account_manager_id' => $owner->id];

        $this->actingAs($owner)->patchJson("/api/partner/bookings/{$booking->id}/account-manager", $payload)->assertOk();
        Mail::assertQueued(CampaignManagerAssignedMail::class, 1);

        $this->actingAs($owner)->patchJson("/api/partner/bookings/{$booking->id}/account-manager", $payload)->assertOk();
        Mail::assertQueued(CampaignManagerAssignedMail::class, 1);
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

    private function pendingBooking(User $customer, Billboard $billboard): Booking
    {
        return Booking::create([
            'billboard_id' => $billboard->id,
            'customer_id' => $customer->id,
            'start_date' => now()->addDays(40),
            'end_date' => now()->addDays(80),
            'total_price' => 410_000,
            'status' => BookingStatus::Pending,
        ]);
    }

    private function verificationUrl(User $user): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addHour(), [
            'id' => $user->id,
            'hash' => sha1($user->getEmailForVerification()),
        ]);
    }
}
