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
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * The aggregates behind the Overview screen's charts, ring and review queue.
 */
class AdminOverviewStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_activity_covers_seven_days_oldest_first(): void
    {
        $stats = $this->statsFor($this->admin());

        $activity = $stats['booking_activity'];
        $this->assertCount(7, $activity);
        $this->assertSame(now()->subDays(6)->toDateString(), $activity[0]['date']);
        $this->assertSame(now()->toDateString(), $activity[6]['date']);
    }

    public function test_booking_activity_counts_bookings_on_the_day_they_were_created(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $billboard = $this->billboard();

        $this->booking($customer, $billboard)->forceFill(['created_at' => now()->subDays(2)])->save();
        $this->booking($customer, $billboard)->forceFill(['created_at' => now()->subDays(2)])->save();
        $this->booking($customer, $billboard)->forceFill(['created_at' => now()])->save();
        // Outside the 7-day window — must not appear anywhere in the series.
        $this->booking($customer, $billboard)->forceFill(['created_at' => now()->subDays(30)])->save();

        $activity = collect($this->statsFor($this->admin())['booking_activity'])
            ->keyBy('date');

        $this->assertSame(2, $activity[now()->subDays(2)->toDateString()]['count']);
        $this->assertSame(1, $activity[now()->toDateString()]['count']);
        $this->assertSame(3, collect($activity)->sum('count'));
    }

    public function test_revenue_activity_only_counts_settled_payments(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $booking = $this->booking($customer, $this->billboard());

        $this->payment($booking, 50_000, PaymentStatus::Success, now()->subDay());
        // A failed attempt and an unsettled one must not show up as income.
        $this->payment($booking, 99_000, PaymentStatus::Failed, now()->subDay());
        $this->payment($booking, 77_000, PaymentStatus::Pending, null);

        $revenue = collect($this->statsFor($this->admin())['revenue_activity'])->keyBy('date');

        $this->assertSame(50_000, $revenue[now()->subDay()->toDateString()]['amount']);
        $this->assertSame(50_000, collect($revenue)->sum('amount'));
    }

    public function test_approval_rate_is_confirmed_over_total_bookings(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $billboard = $this->billboard();

        $this->booking($customer, $billboard, BookingStatus::Confirmed);
        $this->booking($customer, $billboard, BookingStatus::Confirmed);
        $this->booking($customer, $billboard, BookingStatus::Pending);
        $this->booking($customer, $billboard, BookingStatus::Cancelled);

        $this->assertSame(50, $this->statsFor($this->admin())['approval_rate']);
    }

    public function test_approval_rate_is_zero_rather_than_dividing_by_zero(): void
    {
        $this->assertSame(0, $this->statsFor($this->admin())['approval_rate']);
    }

    public function test_the_attention_queue_counts_real_admin_work(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);
        $this->booking($customer, $this->billboard(), BookingStatus::Pending);
        User::factory()->create(['is_suspended' => true]);
        User::factory()->create(['locked_until' => now()->addMinutes(10)]);
        // An expired lockout is no longer something to action.
        User::factory()->create(['locked_until' => now()->subHour()]);

        $queue = collect($this->statsFor($this->admin())['attention'])->keyBy('key');

        $this->assertSame(1, $queue['pending_bookings']['count']);
        $this->assertSame(1, $queue['suspended_accounts']['count']);
        $this->assertSame(1, $queue['locked_accounts']['count']);
    }

    public function test_a_non_admin_cannot_read_platform_stats(): void
    {
        $customer = User::factory()->create(['role' => UserRole::Customer]);

        $this->actingAs($customer)->getJson('/api/admin/stats')->assertForbidden();
    }

    private function statsFor(User $admin): array
    {
        return $this->actingAs($admin)->getJson('/api/admin/stats')->assertOk()->json();
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => UserRole::Admin, 'is_super_admin' => true]);
    }

    private function billboard(): Billboard
    {
        return Billboard::factory()
            ->for(User::factory()->create(['role' => UserRole::Owner]), 'owner')
            ->create();
    }

    private function booking(User $customer, Billboard $billboard, BookingStatus $status = BookingStatus::Pending): Booking
    {
        return Booking::create([
            'billboard_id' => $billboard->id,
            'customer_id' => $customer->id,
            'start_date' => now()->addDays(40),
            'end_date' => now()->addDays(80),
            'total_price' => 410_000,
            'status' => $status,
        ]);
    }

    private function payment(Booking $booking, int $amount, PaymentStatus $status, ?Carbon $paidAt): Payment
    {
        return Payment::create([
            'booking_id' => $booking->id,
            'reference' => 'TGZ-'.strtoupper(fake()->bothify('??????######')),
            'amount' => $amount,
            'email' => 'x@example.com',
            'channel' => 'card',
            'status' => $status,
            'paid_at' => $paidAt,
        ]);
    }
}
