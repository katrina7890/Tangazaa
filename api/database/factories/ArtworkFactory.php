<?php

namespace Database\Factories;

use App\Enums\ArtworkStatus;
use App\Models\Artwork;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Artwork>
 */
class ArtworkFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'owner_id' => User::factory()->owner(),
            'contact_id' => null,
            'billboard_id' => null,
            'title' => fake()->company().' campaign creative',
            'status' => fake()->randomElement(ArtworkStatus::cases())->value,
            'due_date' => fake()->boolean(60) ? now()->addDays(rand(3, 21))->format('Y-m-d') : null,
            'file_name' => fake()->boolean(50) ? fake()->slug(3).'.pdf' : null,
            'notes' => fake()->boolean(40) ? fake()->sentence(12) : null,
        ];
    }
}
