<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\LoginAttempt;
use App\Models\User;
use App\Services\Security\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Security posture: lockouts, suspicious sign-ins, and the acting admin's own
 * device/session list.
 */
class SecurityController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function overview(): JsonResponse
    {
        $since = now()->subDays(7);

        return response()->json([
            'stats' => [
                'locked_accounts' => User::whereNotNull('locked_until')->where('locked_until', '>', now())->count(),
                'suspended_accounts' => User::where('is_suspended', true)->count(),
                'suspicious_logins_7d' => LoginAttempt::where('is_suspicious', true)->where('created_at', '>=', $since)->count(),
                'failed_logins_24h' => LoginAttempt::where('successful', false)->where('created_at', '>=', now()->subDay())->count(),
                'active_sessions' => DB::table('sessions')->whereNotNull('user_id')->count(),
                'admins' => User::where('role', 'admin')->count(),
                'super_admins' => User::where('is_super_admin', true)->count(),
            ],
            // Accounts currently locked out, so an admin can release a
            // legitimate user who fat-fingered their password.
            'locked_accounts' => User::whereNotNull('locked_until')
                ->where('locked_until', '>', now())
                ->get(['id', 'name', 'email', 'locked_until'])
                ->map(fn (User $user) => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'locked_until' => $user->locked_until->toIso8601String(),
                ]),
            'recent_security_events' => AuditLog::query()
                ->whereIn('action', [
                    'auth.account_locked', 'user.suspended', 'user.restored', 'user.unlocked',
                    'admin.created', 'admin.permissions_changed', 'admin.promoted_super', 'admin.demoted_super',
                    'session.revoked',
                ])
                ->latest('id')
                ->limit(15)
                ->get()
                ->map(fn (AuditLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'actor' => $log->actor_name,
                    'target' => $log->target_label,
                    'created_at' => $log->created_at->toIso8601String(),
                ]),
        ]);
    }

    /** Release a brute-force lockout early. */
    public function unlockUser(Request $request, User $user): JsonResponse
    {
        $before = $user->locked_until?->toIso8601String();
        $user->forceFill(['locked_until' => null])->save();

        $this->audit->record(
            action: 'user.unlocked',
            target: $user,
            before: ['locked_until' => $before],
            after: ['locked_until' => null],
        );

        return response()->json(['data' => ['id' => $user->id, 'is_locked' => false]]);
    }

    /**
     * The acting admin's own signed-in devices. Scoped to `auth()->id()` on
     * the server — the client cannot ask for anyone else's sessions.
     */
    public function sessions(Request $request): JsonResponse
    {
        $current = $request->session()->getId();

        $sessions = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->orderByDesc('last_activity')
            ->get(['id', 'ip_address', 'user_agent', 'last_activity']);

        return response()->json([
            'data' => $sessions->map(fn ($session) => [
                // The raw session id is a bearer-equivalent secret, so only a
                // short fingerprint is ever sent to the client.
                'id' => substr(hash('sha256', $session->id), 0, 16),
                'ip_address' => $session->ip_address,
                'user_agent' => $session->user_agent,
                'last_activity' => now()->createFromTimestamp($session->last_activity)->toIso8601String(),
                'is_current' => $session->id === $current,
            ]),
        ]);
    }

    /** Sign out every other device (session hijacking containment). */
    public function revokeOtherSessions(Request $request): JsonResponse
    {
        $removed = DB::table('sessions')
            ->where('user_id', $request->user()->id)
            ->where('id', '!=', $request->session()->getId())
            ->delete();

        $this->audit->record(
            action: 'session.revoked',
            target: $request->user(),
            after: ['sessions_revoked' => $removed],
        );

        return response()->json(['data' => ['revoked' => $removed]]);
    }
}
