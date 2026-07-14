<?php

namespace App\Policies;

use App\Models\User;
use App\Models\WorkOrder;

class WorkOrderPolicy
{
    public function update(User $user, WorkOrder $workOrder): bool
    {
        return $user->isAdmin() || $user->id === $workOrder->owner_id;
    }

    public function delete(User $user, WorkOrder $workOrder): bool
    {
        return $user->isAdmin() || $user->id === $workOrder->owner_id;
    }
}
