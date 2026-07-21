<?php

namespace App\Models;

use App\Enums\AdminPermission;
use App\Enums\EmailTopic;
use App\Enums\UserRole;
use App\Mail\VerifyEmailMail;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Mail;

#[Fillable(['name', 'company_name', 'email', 'phone', 'password', 'role', 'is_suspended', 'employer_id', 'is_super_admin', 'admin_permissions', 'locked_until', 'email_preferences'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail
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
            'is_super_admin' => 'boolean',
            'admin_permissions' => 'array',
            'locked_until' => 'datetime',
            'email_preferences' => 'array',
        ];
    }

    /**
     * Send our own branded Mailable instead of Laravel's stock notification —
     * the stock one links at a Blade page this API doesn't have.
     */
    public function sendEmailVerificationNotification(): void
    {
        Mail::to($this)->send(new VerifyEmailMail($this));
    }

    /**
     * Whether this customer still wants a given transactional email. Absent
     * preferences mean opted in, so existing accounts aren't silenced.
     */
    public function wantsEmail(EmailTopic $topic): bool
    {
        return ($this->email_preferences[$topic->value] ?? true) === true;
    }

    /**
     * Whether this account may perform a privileged admin action.
     *
     * Deliberately strict: only admins qualify at all, Super Admins hold
     * everything, and every other admin holds exactly what was granted.
     */
    public function hasAdminPermission(AdminPermission $permission): bool
    {
        if (! $this->isAdmin() || $this->is_suspended) {
            return false;
        }

        if ($this->is_super_admin) {
            return true;
        }

        return in_array($permission->value, $this->admin_permissions ?? [], true);
    }

    /** Locked out by repeated failed logins (brute-force protection). */
    public function isLocked(): bool
    {
        return $this->locked_until !== null && $this->locked_until->isFuture();
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
