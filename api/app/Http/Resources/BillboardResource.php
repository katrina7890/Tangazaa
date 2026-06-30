<?php

namespace App\Http\Resources;

use App\Enums\BookingStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BillboardResource extends JsonResource
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
            'owner_id' => $this->owner_id,
            'title' => $this->title,
            'location' => $this->location,
            'lat' => $this->lat,
            'lng' => $this->lng,
            'size' => $this->size,
            'type' => $this->type->value,
            'price_per_day' => $this->price_per_day,
            'price_per_week' => $this->price_per_week,
            'description' => $this->description,
            'is_active' => $this->is_active,
            'available_from' => $this->available_from?->format('Y-m-d'),
            // The next genuinely free date (past bookings stepped over). Only when
            // bookings are loaded, so we never trigger an N+1 on list endpoints.
            'next_available_from' => $this->whenLoaded(
                'bookings',
                fn () => $this->nextAvailableDate()->format('Y-m-d'),
            ),
            'owner' => $this->whenLoaded('owner', fn () => [
                'name' => $this->owner->name,
                'company_name' => $this->owner->company_name,
            ]),
            'booked_ranges' => $this->whenLoaded('bookings', fn () => $this->bookings
                ->where('status', BookingStatus::Confirmed)
                ->map(fn ($booking) => [
                    'start' => $booking->start_date->format('Y-m-d'),
                    'end' => $booking->end_date->format('Y-m-d'),
                ])
                ->values()),
        ];
    }
}
