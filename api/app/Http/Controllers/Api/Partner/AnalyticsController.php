<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Models\Billboard;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Business insights for the Partner ERP (PRD §6) — everything computed live
 * from bookings and inventory, nothing stored.
 */
class AnalyticsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $owner = $request->user()->partnerOwner();
        $isStaff = $request->user()->isStaff();
        $today = now()->startOfDay();

        $billboards = $owner->billboards()
            ->whereNull('archived_at')
            ->with(['bookings' => fn ($query) => $query->where('status', BookingStatus::Confirmed)])
            ->get();

        $confirmed = $billboards->flatMap->bookings;
        $appBookings = Booking::query()
            ->whereIn('billboard_id', $billboards->pluck('id'))
            ->where(fn ($query) => $query->whereNull('source')->orWhere('source', 'app'))
            ->get();

        $occupiedToday = $billboards->filter(fn (Billboard $board) => $board->bookings
            ->contains(fn (Booking $booking) => $booking->start_date <= $today && $today <= $booking->end_date))->count();

        // Revenue by month, last 6 months (keyed by campaign start).
        $revenueByMonth = collect(range(5, 0))->map(function (int $back) use ($confirmed, $today) {
            $month = $today->copy()->startOfMonth()->subMonths($back);

            return [
                'month' => $month->format('M Y'),
                'revenue' => $confirmed
                    ->filter(fn (Booking $booking) => $booking->start_date->isSameMonth($month))
                    ->sum('total_price'),
            ];
        });

        $appRevenue = $confirmed->filter(fn (Booking $booking) => ($booking->source?->value ?? 'app') === 'app')->sum('total_price');
        $offlineRevenue = $confirmed->sum('total_price') - $appRevenue;

        $durations = $confirmed->map(fn (Booking $booking) => $booking->start_date->diffInDays($booking->end_date) + 1);
        // Lead time only means something for app bookings (offline deals are often backdated).
        $leadTimes = $confirmed
            ->filter(fn (Booking $booking) => ($booking->source?->value ?? 'app') === 'app'
                && $booking->created_at->startOfDay() <= $booking->start_date)
            ->map(fn (Booking $booking) => $booking->created_at->startOfDay()->diffInDays($booking->start_date));

        return response()->json([
            'stats' => [
                'occupancy_rate' => $billboards->count() > 0 ? (int) round($occupiedToday / $billboards->count() * 100) : 0,
                'avg_duration_days' => $durations->isEmpty() ? null : (int) round($durations->avg()),
                'avg_lead_time_days' => $leadTimes->isEmpty() ? null : (int) round($leadTimes->avg()),
                // App bookings start pending; paid ones become confirmed.
                'conversion_rate' => $appBookings->count() > 0
                    ? (int) round($appBookings->where('status', BookingStatus::Confirmed)->count() / $appBookings->count() * 100)
                    : null,
                'app_revenue' => $isStaff ? null : $appRevenue,
                'offline_revenue' => $isStaff ? null : $offlineRevenue,
            ],
            'revenue_by_month' => $isStaff ? [] : $revenueByMonth->values(),
            'revenue_by_billboard' => $isStaff ? [] : $billboards
                ->map(fn (Billboard $board) => [
                    'title' => $board->title,
                    'revenue' => $board->bookings->sum('total_price'),
                ])
                ->sortByDesc('revenue')
                ->take(6)
                ->values(),
            'most_booked_locations' => $confirmed
                ->groupBy(fn (Booking $booking) => $booking->billboard->location)
                ->map(fn ($group, $location) => ['location' => $location, 'bookings' => $group->count()])
                ->sortByDesc('bookings')
                ->take(5)
                ->values(),
            'insights' => $this->insights($billboards, $confirmed, $today),
        ]);
    }

    /**
     * Plain-language recommendations: vacancy alerts and location demand
     * shifts, in the PRD's own voice.
     *
     * @return array<int, array<string, string>>
     */
    private function insights($billboards, $confirmed, $today): array
    {
        $insights = collect();

        // "This billboard has remained vacant for N days."
        foreach ($billboards as $board) {
            if ($board->under_maintenance) {
                continue;
            }
            $coveringToday = $board->bookings->contains(
                fn (Booking $booking) => $booking->start_date <= $today && $today <= $booking->end_date
            );
            if ($coveringToday) {
                continue;
            }
            $lastEnd = $board->bookings
                ->filter(fn (Booking $booking) => $booking->end_date < $today)
                ->max('end_date');
            $vacantSince = $lastEnd ?? $board->available_from ?? $board->created_at;
            $days = (int) $vacantSince->copy()->startOfDay()->diffInDays($today);
            if ($days >= 14) {
                $insights->push([
                    'type' => 'vacancy',
                    'message' => "{$board->title} has remained vacant for {$days} days.",
                    'suggestion' => 'Consider a discount or a featured spot on the marketplace.',
                ]);
            }
        }

        // "Westlands demand increased by 24% this month." — bookings created
        // this month vs last month, per location.
        $thisMonth = $confirmed->filter(fn (Booking $booking) => $booking->created_at->isSameMonth($today));
        $lastMonth = $confirmed->filter(fn (Booking $booking) => $booking->created_at->isSameMonth($today->copy()->subMonthNoOverflow()));
        $locations = $thisMonth->concat($lastMonth)->map(fn (Booking $booking) => $booking->billboard->location)->unique();

        foreach ($locations as $location) {
            $now = $thisMonth->filter(fn (Booking $booking) => $booking->billboard->location === $location)->count();
            $before = $lastMonth->filter(fn (Booking $booking) => $booking->billboard->location === $location)->count();
            if ($before > 0 && $now !== $before) {
                $delta = (int) round(($now - $before) / $before * 100);
                $insights->push([
                    'type' => 'demand',
                    'message' => sprintf('%s demand %s by %d%% this month.', $location, $delta > 0 ? 'increased' : 'decreased', abs($delta)),
                    'suggestion' => $delta > 0 ? 'Consider raising rates in this area.' : 'Consider promotions to fill these boards.',
                ]);
            }
        }

        return $insights->take(8)->values()->all();
    }
}
