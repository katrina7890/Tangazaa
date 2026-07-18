<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\StoreStaffRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Owner-managed staff accounts. Staff log into Tangazaa Partner with their own
 * credentials so the owner's login (and the owner dashboard) is never shared;
 * there is deliberately no self-service staff signup.
 */
class TeamController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $staff = $request->user()->staffMembers()
            ->orderBy('name')
            ->get(['id', 'name', 'email', 'is_suspended', 'created_at']);

        return response()->json([
            'data' => $staff->map(fn (User $member) => $this->present($member)),
        ]);
    }

    public function store(StoreStaffRequest $request): JsonResponse
    {
        $owner = $request->user();

        $member = User::create([
            'name' => $request->string('name')->toString(),
            'email' => $request->string('email')->toString(),
            'password' => $request->string('password')->toString(),
            'role' => UserRole::Staff,
            'employer_id' => $owner->id,
            'company_name' => $owner->company_name,
        ]);

        return response()->json(['data' => $this->present($member)], 201);
    }

    public function destroy(Request $request, User $member): Response
    {
        abort_unless(
            $member->role === UserRole::Staff && $member->employer_id === $request->user()->id,
            403,
            'You can only remove staff accounts from your own team.',
        );

        $member->delete();

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function present(User $member): array
    {
        return [
            'id' => $member->id,
            'name' => $member->name,
            'email' => $member->email,
            'is_suspended' => (bool) $member->is_suspended,
            'created_at' => $member->created_at->toIso8601String(),
        ];
    }
}
