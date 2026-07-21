<?php

namespace Database\Factories;

use App\Enums\AdminPermission;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'company_name' => fake()->company(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'role' => UserRole::Customer,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }

    public function owner(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Owner,
        ]);
    }

    /**
     * A full-power administrator. Super Admin by default so tests exercising
     * admin endpoints don't each have to enumerate permissions; use
     * `limitedAdmin()` when the point of the test *is* the permission check.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Admin,
            'is_super_admin' => true,
        ]);
    }

    /**
     * An administrator holding only the given granular permissions.
     *
     * @param  array<int, AdminPermission|string>  $permissions
     */
    public function limitedAdmin(array $permissions = []): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Admin,
            'is_super_admin' => false,
            'admin_permissions' => array_map(
                fn ($permission) => $permission instanceof AdminPermission ? $permission->value : $permission,
                $permissions,
            ),
        ]);
    }

    /** A staff account working for the given owner's billboard company. */
    public function staffOf(User $owner): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => UserRole::Staff,
            'employer_id' => $owner->id,
            'company_name' => $owner->company_name,
        ]);
    }
}
