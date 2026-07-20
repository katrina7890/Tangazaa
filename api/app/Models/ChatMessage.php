<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['booking_id', 'sender_id', 'body', 'attachments'])]
class ChatMessage extends Model
{
    protected function casts(): array
    {
        return [
            'attachments' => 'array',
        ];
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /** True when the message came from the booking's customer (vs the company side). */
    public function fromCustomer(): bool
    {
        return $this->sender_id !== null && $this->sender_id === $this->booking->customer_id;
    }
}
