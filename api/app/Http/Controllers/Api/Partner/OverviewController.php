<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\ArtworkStatus;
use App\Enums\BookingStatus;
use App\Enums\WorkOrderStatus;
use App\Http\Controllers\Controller;
use App\Models\Billboard;
use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OverviewController extends Controller
{
    /**
     * The Partner home screen: headline stats plus a per-billboard occupancy
     * snapshot that powers the live occupancy map.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();
        $today = now()->startOfDay();

        $billboards = $user->billboards()
            ->with(['bookings' => fn ($query) => $query
                ->where('status', BookingStatus::Confirmed)
                ->with(['customer', 'contact'])
                ->orderBy('start_date')])
            ->get();

        $occupancy = $billboards->map(function (Billboard $billboard) use ($today) {
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
                'is_active' => $billboard->is_active,
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

        return response()->json([
            'stats' => [
                'billboards' => $billboards->count(),
                'occupied_today' => $occupancy->where('occupied', true)->count(),
                'vacant_today' => $occupancy->where('occupied', false)->count(),
                'active_bookings' => $allConfirmed
                    ->filter(fn (Booking $booking) => $booking->end_date >= $today)
                    ->count(),
                'confirmed_revenue' => $allConfirmed->sum->total_price,
                'contacts' => $user->contacts()->count(),
                'open_artworks' => $user->artworks()
                    ->whereNotIn('status', [ArtworkStatus::Approved, ArtworkStatus::Rejected])
                    ->count(),
                'open_work_orders' => $user->workOrders()
                    ->whereNotIn('status', [WorkOrderStatus::Completed, WorkOrderStatus::Cancelled])
                    ->count(),
            ],
            'billboards' => $occupancy->values(),
        ]);
    }
}
