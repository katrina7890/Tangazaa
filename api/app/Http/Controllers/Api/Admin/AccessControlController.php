<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\AdminPermission;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Security\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Administrator accounts and their granular permissions (RBAC).
 *
 * Reading the roster needs `admins.manage`; *changing* it is restricted to
 * Super Admins. That split is deliberate — otherwise an admin holding
 * `admins.manage` could quietly grant themselves finance powers, which would
 * be privilege escalation by design rather than by bug.
 */
class AccessControlController extends Controller
{
    public function __construct(private AuditLogger $audit) {}

    /** The permission catalogue, grouped for the admin UI matrix. */
    public function permissions(): JsonResponse
    {
        return response()->json([
            'data' => collect(AdminPermission::cases())->map(fn (AdminPermission $permission) => [
                'value' => $permission->value,
                'label' => $permission->label(),
                'group' => $permission->group(),
                'high_risk' => in_array($permission, AdminPermission::highRisk(), true),
            ])->values(),
        ]);
    }

    public function index(): JsonResponse
    {
        $admins = User::query()
            ->where('role', UserRole::Admin)
            ->orderByDesc('is_super_admin')
            ->orderBy('name')
            ->get();

        return response()->json([
            'data' => $admins->map(fn (User $admin) => $this->present($admin)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeSuperAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            // NIST-style: length over composition, and rejected if the password
            // appears in a known breach corpus.
            'password' => ['required', Password::min(12)->letters()->numbers()->symbols()->uncompromised()],
            'permissions' => ['array'],
            'permissions.*' => [Rule::enum(AdminPermission::class)],
        ]);

        $admin = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'company_name' => 'Tangazaa',
            'role' => UserRole::Admin,
            'is_super_admin' => false,
            'admin_permissions' => array_values($data['permissions'] ?? []),
        ]);

        $this->audit->record(
            action: 'admin.created',
            target: $admin,
            after: ['permissions' => $admin->admin_permissions],
        );

        return response()->json(['data' => $this->present($admin)], 201);
    }

    public function updatePermissions(Request $request, User $admin): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        abort_unless($admin->isAdmin(), 422, 'That account is not an administrator.');
        // Self-edits are blocked outright: a trail showing someone granting
        // themselves power is a record of escalation, not a control against it.
        abort_if($admin->id === $request->user()->id, 422, 'You cannot change your own permissions.');
        abort_if($admin->is_super_admin, 422, 'Super Admins already hold every permission.');

        $data = $request->validate([
            'permissions' => ['present', 'array'],
            'permissions.*' => [Rule::enum(AdminPermission::class)],
        ]);

        $before = $admin->admin_permissions ?? [];
        $admin->update(['admin_permissions' => array_values($data['permissions'])]);

        $this->audit->record(
            action: 'admin.permissions_changed',
            target: $admin,
            before: ['permissions' => $before],
            after: ['permissions' => $admin->admin_permissions],
        );

        return response()->json(['data' => $this->present($admin->refresh())]);
    }

    /** Promote to / demote from Super Admin. */
    public function updateSuperAdmin(Request $request, User $admin): JsonResponse
    {
        $this->authorizeSuperAdmin($request);
        abort_unless($admin->isAdmin(), 422, 'That account is not an administrator.');
        abort_if($admin->id === $request->user()->id, 422, 'You cannot change your own Super Admin status.');

        $data = $request->validate(['is_super_admin' => ['required', 'boolean']]);

        // Never let the platform end up with nobody who can grant access.
        if (! $data['is_super_admin']) {
            $remaining = User::where('role', UserRole::Admin)
                ->where('is_super_admin', true)
                ->where('id', '!=', $admin->id)
                ->count();

            abort_if($remaining === 0, 422, 'At least one Super Admin must remain.');
        }

        $before = $admin->is_super_admin;
        $admin->update(['is_super_admin' => $data['is_super_admin']]);

        $this->audit->record(
            action: $data['is_super_admin'] ? 'admin.promoted_super' : 'admin.demoted_super',
            target: $admin,
            before: ['is_super_admin' => $before],
            after: ['is_super_admin' => $admin->is_super_admin],
        );

        return response()->json(['data' => $this->present($admin->refresh())]);
    }

    private function authorizeSuperAdmin(Request $request): void
    {
        abort_unless($request->user()?->is_super_admin, 403, 'Only Super Admins can change administrator access.');
    }

    /** @return array<string, mixed> */
    private function present(User $admin): array
    {
        return [
            'id' => $admin->id,
            'name' => $admin->name,
            'email' => $admin->email,
            'is_super_admin' => $admin->is_super_admin,
            'is_suspended' => $admin->is_suspended,
            'is_locked' => $admin->isLocked(),
            'permissions' => $admin->is_super_admin
                ? array_column(AdminPermission::cases(), 'value')
                : ($admin->admin_permissions ?? []),
            'created_at' => $admin->created_at->toIso8601String(),
        ];
    }
}
