<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class ChatMessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'attachments' => collect($this->attachments ?? [])
                ->map(fn (string $path) => Storage::disk('public')->url($path))
                ->all(),
            'sender' => $this->whenLoaded('sender', fn () => $this->sender ? [
                'name' => $this->sender->name,
            ] : null),
            'from_customer' => $this->fromCustomer(),
            // The requesting side decides "mine" so bubbles align correctly.
            'mine' => $this->sender_id === $request->user()?->id
                || (! $this->fromCustomer() && ! $request->user()?->isCustomer()),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
