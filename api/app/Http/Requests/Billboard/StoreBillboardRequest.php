<?php

namespace App\Http\Requests\Billboard;

use App\Enums\BillboardChannel;
use App\Enums\BillboardType;
use App\Models\Billboard;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBillboardRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('create', Billboard::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'location' => ['required', 'string', 'max:255'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
            'size' => ['required', 'string', 'max:50'],
            'type' => ['required', Rule::in(array_column(BillboardType::cases(), 'value'))],
            'price_per_day' => ['required', 'integer', 'min:1'],
            'price_per_week' => ['required', 'integer', 'min:1'],
            'description' => ['nullable', 'string', 'max:2000'],
            'road' => ['nullable', 'string', 'max:255'],
            'lighting' => ['nullable', Rule::in(['front_lit', 'back_lit', 'led', 'none'])],
            'orientation' => ['nullable', Rule::in(['landscape', 'portrait'])],
            'daily_traffic' => ['nullable', 'integer', 'min:0'],
            'visibility_score' => ['nullable', 'integer', 'between:1,10'],
            'discount_pct' => ['nullable', 'integer', 'between:0,90'],
            'tags' => ['nullable', 'array', 'max:10'],
            'tags.*' => ['string', 'max:40'],
            'amenities' => ['nullable', 'array', 'max:10'],
            'amenities.*' => ['string', 'max:60'],
            // Defaults to `online` (DB default) when omitted.
            'channel' => ['sometimes', Rule::enum(BillboardChannel::class)],
            'under_maintenance' => ['sometimes', 'boolean'],
            'available_from' => ['required', 'date', 'after_or_equal:today'],
        ];
    }
}
