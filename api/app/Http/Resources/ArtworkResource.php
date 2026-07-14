<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ArtworkResource extends JsonResource
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
            'title' => $this->title,
            'status' => $this->status->value,
            'due_date' => $this->due_date?->format('Y-m-d'),
            'file_name' => $this->file_name,
            'notes' => $this->notes,
            'contact' => $this->whenLoaded('contact', fn () => $this->contact ? [
                'id' => $this->contact->id,
                'name' => $this->contact->name,
                'company' => $this->contact->company,
            ] : null),
            'billboard' => $this->whenLoaded('billboard', fn () => $this->billboard ? [
                'id' => $this->billboard->id,
                'title' => $this->billboard->title,
                'location' => $this->billboard->location,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
