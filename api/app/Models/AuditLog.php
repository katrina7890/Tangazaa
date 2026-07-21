<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use RuntimeException;

/**
 * An immutable record of a privileged action.
 *
 * Append-only by design: the table carries no `updated_at`, and the model
 * refuses updates and deletes outright. If a trail could be edited it would be
 * worthless as evidence, so tampering fails loudly rather than silently.
 */
#[Fillable(['actor_id', 'actor_name', 'actor_email', 'action', 'target_type', 'target_id', 'target_label', 'changes', 'ip_address', 'user_agent'])]
class AuditLog extends Model
{
    /** No `updated_at` — a row is written once and never touched again. */
    public const UPDATED_AT = null;

    protected function casts(): array
    {
        return [
            'changes' => 'array',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (): never {
            throw new RuntimeException('Audit log entries are immutable and cannot be modified.');
        });

        static::deleting(function (): never {
            throw new RuntimeException('Audit log entries are immutable and cannot be deleted.');
        });
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
