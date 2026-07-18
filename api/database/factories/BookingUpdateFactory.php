<?php

namespace Database\Factories;

use App\Enums\CampaignStage;
use App\Models\Booking;
use App\Models\BookingUpdate;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BookingUpdate>
 */
class BookingUpdateFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'stage' => fake()->randomElement(CampaignStage::cases()),
            'message' => fake()->sentence(),
            'requires_approval' => false,
        ];
    }

    public function needsApproval(): static
    {
        return $this->state(fn () => ['requires_approval' => true]);
    }
}
