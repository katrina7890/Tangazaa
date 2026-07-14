<?php

namespace App\Models;

use App\Enums\ArtworkStatus;
use Database\Factories\ArtworkFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['owner_id', 'contact_id', 'billboard_id', 'title', 'status', 'due_date', 'file_name', 'notes'])]
class Artwork extends Model
{
    /** @use HasFactory<ArtworkFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'status' => ArtworkStatus::class,
            'due_date' => 'date',
        ];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function billboard(): BelongsTo
    {
        return $this->belongsTo(Billboard::class);
    }
}
