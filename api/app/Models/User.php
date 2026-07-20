<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['name', 'company_name', 'email', 'password', 'role', 'is_suspended', 'employer_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'is_suspended' => 'boolean',
        ];
    }

    public function isCustomer(): bool
    {
        return $this->role === UserRole::Customer;
    }

    public function isOwner(): bool
    {
        return $this->role === UserRole::Owner;
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isStaff(): bool
    {
        return $this->role === UserRole::Staff;
    }

    /** The owner whose company a staff account works for. */
    public function employer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'employer_id');
    }

    public function staffMembers(): HasMany
    {
        return $this->hasMany(User::class, 'employer_id');
    }

    /**
     * The user whose Partner workspace this account operates in: staff act on
     * their employer's data, everyone else on their own.
     */
    public function partnerOwner(): User
    {
        return $this->isStaff() && $this->employer ? $this->employer : $this;
    }

    public function partnerOwnerId(): int
    {
        return $this->isStaff() ? ($this->employer_id ?? $this->id) : $this->id;
    }

    public function billboards(): HasMany
    {
        return $this->hasMany(Billboard::class, 'owner_id');
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class, 'customer_id');
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class, 'owner_id');
    }

    public function artworks(): HasMany
    {
        return $this->hasMany(Artwork::class, 'owner_id');
    }

    public function workOrders(): HasMany
    {
        return $this->hasMany(WorkOrder::class, 'owner_id');
    }

    public function partnerSettings(): HasOne
    {
        return $this->hasOne(PartnerSetting::class, 'owner_id');
    }

    public function appNotifications(): HasMany
    {
        return $this->hasMany(AppNotification::class);
    }
}
