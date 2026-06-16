<?php

namespace Database\Factories;

use App\Enums\BillboardType;
use App\Models\Billboard;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Billboard>
 */
class BillboardFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $pricePerDay = fake()->numberBetween(3000, 8000);

        return [
            'owner_id' => User::factory()->owner(),
            'title' => fake()->streetName().' Billboard',
            'location' => fake()->city(),
            'lat' => fake()->latitude(-4.1, -1.0),
            'lng' => fake()->longitude(36.6, 39.8),
            'size' => fake()->randomElement(['8ft x 16ft', '10ft x 20ft', '12ft x 24ft', '14ft x 28ft']),
            'type' => fake()->randomElement(BillboardType::cases())->value,
            'price_per_day' => $pricePerDay,
            'price_per_week' => $pricePerDay * 7,
            'description' => fake()->sentence(15),
            'is_active' => true,
        ];
    }
}
