<?php

namespace App\Policies;

use App\Models\Artwork;
use App\Models\User;

class ArtworkPolicy
{
    public function update(User $user, Artwork $artwork): bool
    {
        return $user->isAdmin() || $user->id === $artwork->owner_id;
    }

    public function delete(User $user, Artwork $artwork): bool
    {
        return $user->isAdmin() || $user->id === $artwork->owner_id;
    }
}
