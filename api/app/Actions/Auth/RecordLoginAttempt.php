<?php

namespace App\Actions\Auth;

use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Http\Request;

class RecordLoginAttempt
{
    public function handle(Request $request, string $email, bool $successful, ?User $user = null): LoginAttempt
    {
        [$isSuspicious, $reason] = $this->detectSuspicious($request, $email, $successful, $user);

        return LoginAttempt::create([
            'email' => $email,
            'user_id' => $user?->id,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'successful' => $successful,
            'is_suspicious' => $isSuspicious,
            'suspicious_reason' => $reason,
        ]);
    }

    /**
     * @return array{0: bool, 1: string|null}
     */
    protected function detectSuspicious(Request $request, string $email, bool $successful, ?User $user): array
    {
        $recentFailures = LoginAttempt::where('email', $email)
            ->where('successful', false)
            ->where('created_at', '>=', now()->subMinutes(15))
            ->count();

        if (! $successful && $recentFailures + 1 >= 5) {
            return [true, 'Repeated failed login attempts'];
        }

        if ($successful && $recentFailures >= 3) {
            return [true, 'Successful login after repeated failed attempts'];
        }

        if ($successful && $user) {
            $hasPriorLogins = LoginAttempt::where('user_id', $user->id)
                ->where('successful', true)
                ->exists();

            $knownIp = LoginAttempt::where('user_id', $user->id)
                ->where('successful', true)
                ->where('ip_address', $request->ip())
                ->exists();

            if ($hasPriorLogins && ! $knownIp) {
                return [true, 'Login from a new IP address'];
            }
        }

        return [false, null];
    }
}
