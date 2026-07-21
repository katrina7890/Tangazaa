<?php

namespace App\Http\Controllers\Api;

use App\Actions\Auth\ApplyLoginLockout;
use App\Actions\Auth\RecordLoginAttempt;
use App\Actions\Auth\RegisterUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(RegisterRequest $request, RegisterUser $registerUser): JsonResponse
    {
        $user = $registerUser->handle($request->validated());

        // Verification is a nudge, not a gate — the account is usable straight
        // away and the SPA shows a banner until the address is confirmed.
        $user->sendEmailVerificationNotification();

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $user], 201);
    }

    public function login(LoginRequest $request, RecordLoginAttempt $recordLoginAttempt, ApplyLoginLockout $lockout): JsonResponse
    {
        $email = $request->string('email')->toString();
        $user = User::where('email', $email)->first();

        // A locked account never reaches credential checking, so a lockout
        // can't be worn down by continuing to guess.
        if ($user?->isLocked()) {
            $recordLoginAttempt->handle($request, $email, successful: false, user: $user);

            throw ValidationException::withMessages([
                'email' => ['Too many failed attempts. Try again in '.max(1, (int) ceil(now()->diffInMinutes($user->locked_until, absolute: true))).' minutes.'],
            ]);
        }

        if (! Auth::attempt($request->only('email', 'password'))) {
            $recordLoginAttempt->handle($request, $email, successful: false, user: $user);
            $justLocked = $lockout->registerFailure($user);

            throw ValidationException::withMessages([
                'email' => [$justLocked
                    ? 'Too many failed attempts. This account is locked for '.ApplyLoginLockout::LOCK_MINUTES.' minutes.'
                    // Deliberately generic: never reveal whether the address exists.
                    : 'The provided credentials are incorrect.'],
            ]);
        }

        if (Auth::user()->is_suspended) {
            Auth::logout();
            $recordLoginAttempt->handle($request, $email, successful: false, user: $user);

            throw ValidationException::withMessages([
                'email' => ['This account has been suspended. Contact support.'],
            ]);
        }

        // Regenerating on login defeats session fixation.
        $request->session()->regenerate();
        $recordLoginAttempt->handle($request, $email, successful: true, user: Auth::user());
        $lockout->clear(Auth::user());

        return response()->json(['user' => Auth::user()]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(null, 204);
    }
}
