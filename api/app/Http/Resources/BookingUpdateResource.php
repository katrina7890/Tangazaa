<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class BookingUpdateResource extends JsonResource
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
            'stage' => $this->stage->value,
            'message' => $this->message,
            // Absolute URLs (public disk is rooted at APP_URL/storage) so the
            // SPA can render them even when the API lives on another domain.
            'photos' => collect($this->photos ?? [])
                ->map(fn (string $path) => Storage::disk('public')->url($path))
                ->all(),
            'requires_approval' => $this->requires_approval,
            'client_reaction' => $this->client_reaction?->value,
            'client_comment' => $this->client_comment,
            'author' => $this->whenLoaded('author', fn () => $this->author ? [
                'name' => $this->author->name,
                'company_name' => $this->author->company_name,
            ] : null),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
