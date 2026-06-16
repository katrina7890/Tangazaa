<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
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
            'billboard' => [
                'id' => $this->billboard->id,
                'title' => $this->billboard->title,
                'location' => $this->billboard->location,
            ],
            'customer' => $this->whenLoaded('customer', fn () => [
                'name' => $this->customer->name,
                'company_name' => $this->customer->company_name,
            ]),
            'start_date' => $this->start_date->format('Y-m-d'),
            'end_date' => $this->end_date->format('Y-m-d'),
            'total_price' => $this->total_price,
            'status' => $this->status->value,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
