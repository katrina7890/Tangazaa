<?php

namespace Database\Factories;

use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use App\Models\Billboard;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WorkOrder>
 */
class WorkOrderFactory extends Factory
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
            'billboard_id' => Billboard::factory(),
            'artwork_id' => null,
            'type' => fake()->randomElement(WorkOrderType::cases())->value,
            'status' => WorkOrderStatus::Pending->value,
            'assignee_name' => fake()->boolean(70) ? fake()->firstName() : null,
            'scheduled_for' => fake()->boolean(60) ? now()->addDays(rand(1, 14))->format('Y-m-d') : null,
            'notes' => fake()->boolean(40) ? fake()->sentence(10) : null,
            'completed_at' => null,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn () => [
            'status' => WorkOrderStatus::Completed->value,
            'completed_at' => now()->subDays(rand(0, 10)),
        ]);
    }
}
