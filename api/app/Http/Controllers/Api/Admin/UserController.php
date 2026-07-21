<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminUserResource;
use App\Models\User;
use App\Services\Security\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
            'role' => ['nullable', Rule::in(['customer', 'owner', 'admin'])],
        ]);

        $users = User::query()
            ->when($request->string('search')->toString(), function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%");
                });
            })
            ->when($request->string('role')->toString(), fn ($query, $role) => $query->where('role', $role))
            ->latest('id')
            ->paginate(15);

        return AdminUserResource::collection($users);
    }

    public function toggleSuspension(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            abort(422, 'You cannot suspend your own account.');
        }

        // Only a Super Admin may suspend another administrator — otherwise
        // admins could disable each other and lock the platform out.
        if ($user->isAdmin()) {
            abort_unless($request->user()->is_super_admin, 403, 'Only Super Admins can suspend an administrator.');
        }

        $before = $user->is_suspended;
        $user->update(['is_suspended' => ! $user->is_suspended]);

        $this->audit->record(
            action: $user->is_suspended ? 'user.suspended' : 'user.restored',
            target: $user,
            before: ['is_suspended' => $before],
            after: ['is_suspended' => $user->is_suspended],
        );

        return response()->json(['data' => new AdminUserResource($user)]);
    }
}
