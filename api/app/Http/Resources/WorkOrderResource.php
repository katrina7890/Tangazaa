<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class WorkOrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'status' => $this->status->value,
            'assignee_name' => $this->assignee_name,
            'scheduled_for' => $this->scheduled_for?->format('Y-m-d'),
            'notes' => $this->notes,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'billboard' => $this->whenLoaded('billboard', fn () => [
                'id' => $this->billboard->id,
                'title' => $this->billboard->title,
                'location' => $this->billboard->location,
                'lat' => $this->billboard->lat,
                'lng' => $this->billboard->lng,
            ]),
            'artwork' => $this->whenLoaded('artwork', fn () => $this->artwork ? [
                'id' => $this->artwork->id,
                'title' => $this->artwork->title,
                'status' => $this->artwork->status->value,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
