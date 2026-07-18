<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

class ContactPolicy
{
    public function update(User $user, Contact $contact): bool
    {
        // partnerOwnerId lets staff act on their employer's records.
        return $user->isAdmin() || $user->partnerOwnerId() === $contact->owner_id;
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $user->isAdmin() || $user->partnerOwnerId() === $contact->owner_id;
    }
}
