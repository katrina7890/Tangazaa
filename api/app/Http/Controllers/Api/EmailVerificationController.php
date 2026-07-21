<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class EmailVerificationController extends Controller
{
    /**
     * Land the signed link from the email, then bounce to the SPA.
     *
     * Deliberately not behind `auth:sanctum`: the link is often opened in a
     * different browser (or a webmail preview) from the one that signed up, so
     * the signature plus the email hash is the whole authentication story.
     */
    public function verify(Request $request, int $id, string $hash): RedirectResponse
    {
        $user = User::find($id);
        $dashboard = config('app.frontend_url').'/dashboard';

        if (! $user || ! hash_equals($hash, sha1($user->getEmailForVerification()))) {
            return redirect()->away($dashboard.'?verified=invalid');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect()->away($dashboard.'?verified=already');
        }

        $user->markEmailAsVerified();

        return redirect()->away($dashboard.'?verified=1');
    }

    /** Re-send the link from the dashboard banner. Throttled in routes/api.php. */
    public function resend(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'This address is already verified.'], 422);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email sent — check your inbox.']);
    }
}
