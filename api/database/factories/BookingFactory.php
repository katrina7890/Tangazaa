<?php

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = fake()->dateTimeBetween('-30 days', '+30 days');
        $days = fake()->numberBetween(30, 60);
        $end = (clone $start)->modify("+{$days} days");

        return [
            'billboard_id' => Billboard::factory(),
            'customer_id' => User::factory(),
            'start_date' => $start->format('Y-m-d'),
            'end_date' => $end->format('Y-m-d'),
            'total_price' => $days * fake()->numberBetween(3000, 8000),
            'status' => BookingStatus::Confirmed->value,
        ];
    }
}
