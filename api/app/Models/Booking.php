<?php

namespace App\Models;

use App\Enums\BookingSource;
use App\Enums\BookingStatus;
use Database\Factories\BookingFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['billboard_id', 'customer_id', 'contact_id', 'account_manager_id', 'account_manager_assigned_at', 'start_date', 'end_date', 'total_price', 'status', 'source'])]
class Booking extends Model
{
    /** @use HasFactory<BookingFactory> */
    use HasFactory;

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'total_price' => 'integer',
            'status' => BookingStatus::class,
            'source' => BookingSource::class,
            'account_manager_assigned_at' => 'datetime',
        ];
    }

    /**
     * Human-readable contract reference printed on the PDF. Derived from the
     * id rather than stored so it can never drift out of sync with the row.
     */
    public function contractNumber(): string
    {
        return 'TGZ-C-'.str_pad((string) $this->id, 6, '0', STR_PAD_LEFT);
    }

    public function billboard(): BelongsTo
    {
        return $this->belongsTo(Billboard::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /** The salesperson at the billboard company running this campaign. */
    public function accountManager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'account_manager_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * The payment attempt the customer is currently acting on — used by the
     * dashboard/detail flow to resume an unfinished checkout.
     */
    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    /** Campaign progress updates posted by the billboard company. */
    public function updates(): HasMany
    {
        return $this->hasMany(BookingUpdate::class);
    }

    /** ERP pipeline stage records (only stages that have been touched). */
    public function stages(): HasMany
    {
        return $this->hasMany(BookingStage::class);
    }

    /** Chat Centre thread for this booking. */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class);
    }

    public function latestUpdate(): HasOne
    {
        return $this->hasOne(BookingUpdate::class)->latestOfMany();
    }
}
