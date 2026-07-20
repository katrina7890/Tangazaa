<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\ArtworkStatus;
use App\Enums\BillboardChannel;
use App\Enums\BookingStatus;
use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use App\Http\Controllers\Controller;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\BookingUpdate;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OverviewController extends Controller
{
    /**
     * The Partner ERP home screen: headline stats (whole-portfolio, online and
     * offline inventory together), a per-billboard snapshot that powers the
     * colour-coded map, and a recent-activity feed.
     */
    public function __invoke(Request $request): JsonResponse
    {
        // Staff operate in their employer's workspace; the money stays the owner's.
        $user = $request->user()->partnerOwner();
        $isStaff = $request->user()->isStaff();
        $today = now()->startOfDay();

        $billboards = $user->billboards()
            ->with(['bookings' => fn ($query) => $query
                ->where('status', BookingStatus::Confirmed)
                ->with(['customer', 'contact'])
                ->orderBy('start_date')])
            ->get();

        $snapshot = $billboards->map(function (Billboard $billboard) use ($today) {
            /** @var Booking|null $current */
            $current = $billboard->bookings->first(
                fn (Booking $booking) => $booking->start_date <= $today && $today <= $booking->end_date
            );

            return [
                'id' => $billboard->id,
                'title' => $billboard->title,
                'location' => $billboard->location,
                'lat' => $billboard->lat,
                'lng' => $billboard->lng,
                'size' => $billboard->size,
                'price_per_week' => $billboard->price_per_week,
                'is_active' => $billboard->is_active,
                'channel' => $billboard->channel?->value ?? 'online',
                'under_maintenance' => (bool) $billboard->under_maintenance,
                'occupied' => $current !== null,
                'current_booking' => $current ? [
                    'start_date' => $current->start_date->format('Y-m-d'),
                    'end_date' => $current->end_date->format('Y-m-d'),
                    'source' => $current->source?->value ?? 'app',
                    'advertiser' => $current->customer?->company_name
                        ?? $current->customer?->name
                        ?? $current->contact?->company
                        ?? $current->contact?->name,
                ] : null,
                'next_available_from' => $billboard->nextAvailableDate()->format('Y-m-d'),
            ];
        });

        $allConfirmed = $billboards->flatMap->bookings;
        $total = $billboards->count();
        $occupied = $snapshot->where('occupied', true)->count();
        $maintenance = $snapshot->where('under_maintenance', true)->count();

        return response()->json([
            'stats' => [
                'billboards' => $total,
                'online' => $snapshot->where('channel', BillboardChannel::Online->value)->count(),
                'offline' => $snapshot->where('channel', BillboardChannel::Offline->value)->count(),
                'maintenance' => $maintenance,
                'occupied_today' => $occupied,
                // Sellable right now: not occupied and not in maintenance.
                'available_today' => $snapshot
                    ->filter(fn (array $board) => ! $board['occupied'] && ! $board['under_maintenance'])
                    ->count(),
                'occupancy_pct' => $total > 0 ? (int) round($occupied / $total * 100) : 0,
                'active_bookings' => $allConfirmed
                    ->filter(fn (Booking $booking) => $booking->end_date >= $today)
                    ->count(),
                'ending_soon' => $allConfirmed
                    ->filter(fn (Booking $booking) => $booking->end_date >= $today
                        && $booking->end_date <= $today->copy()->addDays(14))
                    ->count(),
                'upcoming_installations' => $user->workOrders()
                    ->where('type', WorkOrderType::Installation)
                    ->whereIn('status', [WorkOrderStatus::Pending, WorkOrderStatus::Scheduled])
                    ->where(fn ($query) => $query
                        ->whereNull('scheduled_for')
                        ->orWhere('scheduled_for', '>=', $today))
                    ->count(),
                // Owner-only: employees see operations, not the company's money.
                'confirmed_revenue' => $isStaff ? null : $allConfirmed->sum->total_price,
                'contacts' => $user->contacts()->count(),
                'open_artworks' => $user->artworks()
                    ->whereNotIn('status', [ArtworkStatus::Approved, ArtworkStatus::Rejected])
                    ->count(),
                'open_work_orders' => $user->workOrders()
                    ->whereNotIn('status', [WorkOrderStatus::Completed, WorkOrderStatus::Cancelled])
                    ->count(),
            ],
            'billboards' => $snapshot->values(),
            'activity' => $this->recentActivity($user->id),
        ]);
    }

    /**
     * A single merged feed of the workspace's latest events — bookings landing,
     * campaign updates going out, jobs and artwork moving.
     *
     * @return array<int, array<string, string|null>>
     */
    private function recentActivity(int $ownerId): array
    {
        $bookings = Booking::query()
            ->whereHas('billboard', fn ($query) => $query->where('owner_id', $ownerId))
            ->with(['billboard', 'customer', 'contact'])
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (Booking $booking) => [
                'type' => 'booking',
                'title' => sprintf(
                    '%s — %s booking on %s',
                    $booking->customer?->company_name
                        ?? $booking->customer?->name
                        ?? $booking->contact?->company
                        ?? $booking->contact?->name
                        ?? 'New booking',
                    ($booking->source?->value ?? 'app') === 'offline' ? 'offline' : 'app',
                    $booking->billboard->title,
                ),
                'detail' => $booking->start_date->format('M j').' → '.$booking->end_date->format('M j, Y'),
                'at' => $booking->created_at->toIso8601String(),
            ]);

        $updates = BookingUpdate::query()
            ->whereHas('booking.billboard', fn ($query) => $query->where('owner_id', $ownerId))
            ->with('booking.billboard')
            ->latest()
            ->limit(6)
            ->get()
            ->map(fn (BookingUpdate $update) => [
                'type' => 'campaign',
                'title' => 'Campaign update posted on '.$update->booking->billboard->title,
                'detail' => $update->message ? str($update->message)->limit(70)->toString() : 'Photos shared',
                'at' => $update->created_at->toIso8601String(),
            ]);

        $jobs = WorkOrder::query()
            ->where('owner_id', $ownerId)
            ->with('billboard')
            ->latest('updated_at')
            ->limit(6)
            ->get()
            ->map(fn (WorkOrder $order) => [
                'type' => 'job',
                'title' => ucfirst($order->type->value).' — '.str_replace('_', ' ', $order->status->value),
                'detail' => $order->billboard?->title ?? $order->assignee_name,
                'at' => $order->updated_at->toIso8601String(),
            ]);

        return $bookings->concat($updates)->concat($jobs)
            ->sortByDesc('at')
            ->take(10)
            ->values()
            ->all();
    }
}
