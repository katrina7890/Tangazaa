<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function stats(): JsonResponse
    {
        return response()->json([
            'companies' => User::where('role', UserRole::Owner)->count(),
            'billboards_active' => Billboard::where('is_active', true)->count(),
            'billboards_total' => Billboard::count(),
            'customers' => User::where('role', UserRole::Customer)->count(),
            'bookings_total' => Booking::count(),
            'revenue_confirmed' => (int) Booking::where('status', BookingStatus::Confirmed)->sum('total_price'),
            'recent_signups' => User::where('created_at', '>=', now()->subDays(7))
                ->latest('id')
                ->limit(10)
                ->get(['id', 'name', 'company_name', 'role', 'created_at']),
            'suspicious_logins_count' => LoginAttempt::where('is_suspicious', true)
                ->where('created_at', '>=', now()->subDays(7))
                ->count(),
        ]);
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
