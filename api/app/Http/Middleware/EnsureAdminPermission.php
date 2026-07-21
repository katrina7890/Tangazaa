<?php

namespace App\Http\Middleware;

use App\Enums\AdminPermission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Server-side authorization for admin endpoints.
 *
 * Every privileged route names the capability it needs; nothing is inferred
 * from the client. A missing or unknown permission is a 403, never a pass —
 * a typo in a route guard must fail closed.
 */
class EnsureAdminPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $required = AdminPermission::tryFrom($permission);

        abort_if($required === null, 403, 'Unknown permission.');
        abort_unless($request->user()?->hasAdminPermission($required), 403, 'You do not have permission to do that.');

        return $next($request);
    }
}
