<?php

namespace App\Policies;

use App\Models\Billboard;
use App\Models\User;

class BillboardPolicy
{
    public function create(User $user): bool
    {
        return $user->isOwner() || $user->isAdmin();
    }

    public function update(User $user, Billboard $billboard): bool
    {
        return $user->isAdmin() || $user->id === $billboard->owner_id;
    }

    public function delete(User $user, Billboard $billboard): bool
    {
        return $user->isAdmin() || $user->id === $billboard->owner_id;
    }
}
