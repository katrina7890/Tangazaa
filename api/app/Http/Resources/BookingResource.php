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
                'lat' => $this->billboard->lat,
                'lng' => $this->billboard->lng,
                'type' => $this->billboard->type->value,
                'price_per_week' => $this->billboard->price_per_week,
            ],
            // Offline bookings have no app customer — a CRM contact instead.
            'customer' => $this->whenLoaded('customer', fn () => $this->customer ? [
                'name' => $this->customer->name,
                'company_name' => $this->customer->company_name,
            ] : null),
            'contact' => $this->whenLoaded('contact', fn () => $this->contact ? [
                'id' => $this->contact->id,
                'name' => $this->contact->name,
                'company' => $this->contact->company,
            ] : null),
            'source' => $this->source?->value ?? 'app',
            'start_date' => $this->start_date->format('Y-m-d'),
            'end_date' => $this->end_date->format('Y-m-d'),
            'total_price' => $this->total_price,
            'status' => $this->status->value,
            'payment' => $this->whenLoaded('latestPayment', fn () => $this->latestPayment ? [
                'reference' => $this->latestPayment->reference,
                'status' => $this->latestPayment->status->value,
                'amount' => $this->latestPayment->amount,
            ] : null),
            // Campaign-progress summary for the dashboard card (full timeline
            // comes from /bookings/{id}/updates).
            'updates_count' => $this->whenCounted('updates'),
            'pending_approvals' => $this->whenCounted('pending_approvals'),
            'latest_update' => $this->whenLoaded('latestUpdate', fn () => $this->latestUpdate ? [
                'stage' => $this->latestUpdate->stage->value,
                'created_at' => $this->latestUpdate->created_at->toIso8601String(),
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
