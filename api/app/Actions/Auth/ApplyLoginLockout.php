<?php

namespace App\Actions\Auth;

use App\Models\LoginAttempt;
use App\Models\User;
use App\Services\Security\AuditLogger;

/**
 * Brute-force protection: after enough failures in a short window the account
 * is locked for a cooling-off period.
 *
 * This complements (not replaces) the per-endpoint rate limiter — the limiter
 * slows an attacker down per IP, the lockout protects a specific account no
 * matter how many hosts the attempts come from.
 */
class ApplyLoginLockout
{
    public const MAX_ATTEMPTS = 5;

    public const WINDOW_MINUTES = 15;

    public const LOCK_MINUTES = 15;

    public function __construct(private AuditLogger $audit) {}

    /**
     * Record a failed attempt and lock the account if it has crossed the
     * threshold. Returns true when this failure triggered a lock.
     */
    public function registerFailure(?User $user): bool
    {
        if (! $user || $user->isLocked()) {
            return false;
        }

        $failures = LoginAttempt::where('email', $user->email)
            ->where('successful', false)
            ->where('created_at', '>=', now()->subMinutes(self::WINDOW_MINUTES))
            ->count();

        if ($failures < self::MAX_ATTEMPTS) {
            return false;
        }

        $user->forceFill(['locked_until' => now()->addMinutes(self::LOCK_MINUTES)])->save();

        // Locking is a security event in its own right — the actor is the
        // anonymous attacker, so the trail records the target account only.
        $this->audit->record(
            action: 'auth.account_locked',
            target: $user,
            after: ['locked_until' => $user->locked_until?->toIso8601String()],
            actor: null,
        );

        return true;
    }

    /** A good login clears any prior lock. */
    public function clear(User $user): void
    {
        if ($user->locked_until !== null) {
            $user->forceFill(['locked_until' => null])->save();
        }
    }
}
