<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
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
            'name' => $this->name,
            'company' => $this->company,
            'email' => $this->email,
            'phone' => $this->phone,
            'notes' => $this->notes,
            'bookings_count' => $this->whenCounted('bookings'),
            'artworks_count' => $this->whenCounted('artworks'),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
