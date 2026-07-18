<?php

namespace App\Policies;

use App\Models\Artwork;
use App\Models\User;

class ArtworkPolicy
{
    public function update(User $user, Artwork $artwork): bool
    {
        // partnerOwnerId lets staff act on their employer's records.
        return $user->isAdmin() || $user->partnerOwnerId() === $artwork->owner_id;
    }

    public function delete(User $user, Artwork $artwork): bool
    {
        return $user->isAdmin() || $user->partnerOwnerId() === $artwork->owner_id;
    }
}
