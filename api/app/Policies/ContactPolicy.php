<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

class ContactPolicy
{
    public function update(User $user, Contact $contact): bool
    {
        return $user->isAdmin() || $user->id === $contact->owner_id;
    }

    public function delete(User $user, Contact $contact): bool
    {
        return $user->isAdmin() || $user->id === $contact->owner_id;
    }
}
