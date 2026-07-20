<?php

namespace App\Http\Requests\Billboard;

use App\Enums\BillboardChannel;
use App\Enums\BillboardType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBillboardRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('billboard'));
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
            'is_active' => ['sometimes', 'boolean'],
            'channel' => ['sometimes', Rule::enum(BillboardChannel::class)],
            'under_maintenance' => ['sometimes', 'boolean'],
            'archived' => ['sometimes', 'boolean'],
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
            // Editable, but no past-date guard here: an existing billboard may
            // legitimately already be available from a date in the past.
            'available_from' => ['sometimes', 'nullable', 'date'],
        ];
    }
}
