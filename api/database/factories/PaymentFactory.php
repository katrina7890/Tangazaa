<?php

namespace Database\Factories;

use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Payment>
 */
class PaymentFactory extends Factory
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
            'reference' => 'TGZ-'.strtoupper(fake()->bothify('??##??##??')),
            'amount' => fake()->numberBetween(30000, 240000),
            'email' => fake()->safeEmail(),
            'channel' => fake()->randomElement(['card', 'mpesa']),
            'status' => PaymentStatus::Pending->value,
            'paid_at' => null,
        ];
    }

    public function paid(): static
    {
        return $this->state(fn () => [
            'status' => PaymentStatus::Success->value,
            'paid_at' => now(),
        ]);
    }
}
