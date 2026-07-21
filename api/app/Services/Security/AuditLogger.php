<?php

namespace App\Services\Security;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

/**
 * Records privileged actions to the immutable audit trail.
 *
 * Every write captures who acted, what changed, and from where — the actor's
 * name/email are copied in so the entry stays meaningful after account
 * deletion.
 */
class AuditLogger
{
    /**
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     */
    public function record(
        string $action,
        ?Model $target = null,
        ?array $before = null,
        ?array $after = null,
        ?string $targetLabel = null,
        ?User $actor = null,
    ): AuditLog {
        $actor ??= auth()->user();

        return AuditLog::create([
            'actor_id' => $actor?->id,
            'actor_name' => $actor?->name,
            'actor_email' => $actor?->email,
            'action' => $action,
            'target_type' => $target ? class_basename($target) : null,
            'target_id' => $target?->getKey(),
            'target_label' => $targetLabel ?? $this->labelFor($target),
            'changes' => $this->diff($before, $after),
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }

    /**
     * Keep only fields that actually changed, so a trail entry reads as a
     * precise statement rather than a dump of the whole record.
     *
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     * @return array<string, mixed>|null
     */
    private function diff(?array $before, ?array $after): ?array
    {
        if ($before === null && $after === null) {
            return null;
        }

        $keys = array_unique([...array_keys($before ?? []), ...array_keys($after ?? [])]);
        $changed = [];

        foreach ($keys as $key) {
            $from = $before[$key] ?? null;
            $to = $after[$key] ?? null;
            if ($from !== $to) {
                $changed[$key] = ['from' => $from, 'to' => $to];
            }
        }

        return $changed ?: null;
    }

    private function labelFor(?Model $target): ?string
    {
        if (! $target) {
            return null;
        }

        foreach (['title', 'name', 'email'] as $attribute) {
            if (filled($target->getAttribute($attribute))) {
                return (string) $target->getAttribute($attribute);
            }
        }

        return null;
    }
}
