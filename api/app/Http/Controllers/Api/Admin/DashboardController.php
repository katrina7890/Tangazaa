<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\LoginAttempt;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        $bookingsTotal = Booking::count();
        $confirmed = Booking::where('status', BookingStatus::Confirmed)->count();

        return response()->json([
            'companies' => User::where('role', UserRole::Owner)->count(),
            'billboards_active' => Billboard::where('is_active', true)->count(),
            'billboards_total' => Billboard::count(),
            'customers' => User::where('role', UserRole::Customer)->count(),
            'bookings_total' => $bookingsTotal,
            'revenue_confirmed' => (int) Booking::where('status', BookingStatus::Confirmed)->sum('total_price'),
            'recent_signups' => User::where('created_at', '>=', now()->subDays(7))
                ->latest('id')
                ->limit(10)
                ->get(['id', 'name', 'company_name', 'role', 'created_at']),
            'suspicious_logins_count' => LoginAttempt::where('is_suspicious', true)
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),

            // --- Overview panels (the 2a mockup's charts, rings and queues) ---
            // All aggregate counts, so they stay at the same sensitivity as the
            // rest of this endpoint. Anything per-record (audit entries, login
            // rows) deliberately stays behind its own `permission:` route.
            'booking_activity' => $this->bookingActivity(),
            'revenue_activity' => $this->revenueActivity(),
            'approval_rate' => $bookingsTotal > 0 ? (int) round($confirmed / $bookingsTotal * 100) : 0,
            'attention' => $this->attentionQueue(),
        ]);
    }

    /**
     * Bookings created on each of the last 7 days.
     *
     * Grouped in PHP rather than SQL because the date functions differ between
     * SQLite (local) and Postgres (Render); a 7-day window is small enough that
     * pulling the timestamps costs nothing.
     *
     * @return array<int, array{day: string, date: string, count: int}>
     */
    private function bookingActivity(): array
    {
        $created = Booking::where('created_at', '>=', now()->subDays(6)->startOfDay())
            ->pluck('created_at');

        return $this->lastSevenDays(function ($day) use ($created) {
            return ['count' => $created->filter(fn ($at) => $at->isSameDay($day))->count()];
        });
    }

    /**
     * Money actually settled on each of the last 7 days — keyed off the payment
     * date, not the booking's start, so the bars mean "what came in".
     *
     * @return array<int, array{day: string, date: string, amount: int}>
     */
    private function revenueActivity(): array
    {
        $payments = Payment::where('status', PaymentStatus::Success)
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', now()->subDays(6)->startOfDay())
            ->get(['amount', 'paid_at']);

        return $this->lastSevenDays(function ($day) use ($payments) {
            return [
                'amount' => (int) $payments
                    ->filter(fn (Payment $payment) => $payment->paid_at->isSameDay($day))
                    ->sum('amount'),
            ];
        });
    }

    /**
     * What an admin should look at today. Counts only — each item links the SPA
     * at the section that can actually action it.
     *
     * @return array<int, array{key: string, label: string, count: int, tone: string}>
     */
    private function attentionQueue(): array
    {
        return [
            [
                'key' => 'flagged_logins',
                'label' => 'Flagged logins to review',
                'count' => LoginAttempt::where('is_suspicious', true)
                    ->where('created_at', '>=', now()->subDays(7))
                    ->count(),
                'tone' => 'coral',
            ],
            [
                'key' => 'locked_accounts',
                'label' => 'Accounts locked out',
                'count' => User::whereNotNull('locked_until')
                    ->where('locked_until', '>', now())
                    ->count(),
                'tone' => 'maroon',
            ],
            [
                'key' => 'suspended_accounts',
                'label' => 'Suspended accounts',
                'count' => User::where('is_suspended', true)->count(),
                'tone' => 'purple',
            ],
            [
                'key' => 'pending_bookings',
                'label' => 'Bookings awaiting payment',
                'count' => Booking::where('status', BookingStatus::Pending)->count(),
                'tone' => 'mint',
            ],
        ];
    }

    /**
     * Walk the last 7 days oldest-first, merging in whatever the callback
     * measures for that day.
     *
     * @param  callable(Carbon): array<string, mixed>  $measure
     * @return array<int, array<string, mixed>>
     */
    private function lastSevenDays(callable $measure): array
    {
        $days = [];

        for ($offset = 6; $offset >= 0; $offset--) {
            $day = now()->subDays($offset)->startOfDay();
            $days[] = [
                'day' => $day->format('D'),
                'date' => $day->toDateString(),
                ...$measure($day),
            ];
        }

        return $days;
    }

    public function loginAttempts(): JsonResponse
    {
        $attempts = LoginAttempt::query()
            ->with('user:id,name,company_name')
            ->latest('id')
            ->limit(50)
            ->get()
            ->map(fn (LoginAttempt $attempt) => [
                'id' => $attempt->id,
                'email' => $attempt->email,
                'user' => $attempt->user ? [
                    'name' => $attempt->user->name,
                    'company_name' => $attempt->user->company_name,
                ] : null,
                'ip_address' => $attempt->ip_address,
                'user_agent' => $attempt->user_agent,
                'successful' => $attempt->successful,
                'is_suspicious' => $attempt->is_suspicious,
                'suspicious_reason' => $attempt->suspicious_reason,
                'created_at' => $attempt->created_at->toIso8601String(),
            ]);

        return response()->json(['data' => $attempts]);
    }
}
