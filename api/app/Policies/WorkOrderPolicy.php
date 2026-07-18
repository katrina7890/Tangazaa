<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;

class WorkOrderPolicy
{
    public function update(User $user, WorkOrder $workOrder): bool
    {
        // partnerOwnerId lets staff act on their employer's records.
        return $user->isAdmin() || $user->partnerOwnerId() === $workOrder->owner_id;
    }

    public function delete(User $user, WorkOrder $workOrder): bool
    {
        return $user->isAdmin() || $user->partnerOwnerId() === $workOrder->owner_id;
    }
}
