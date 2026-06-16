<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['email', 'user_id', 'ip_address', 'user_agent', 'successful', 'is_suspicious', 'suspicious_reason'])]
class LoginAttempt extends Model
{
    protected function casts(): array
    {
        return [
            'successful' => 'boolean',
            'is_suspicious' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
