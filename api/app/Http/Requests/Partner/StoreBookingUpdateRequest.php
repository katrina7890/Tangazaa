<?php

namespace App\Http\Requests\Partner;

use App\Enums\CampaignStage;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreBookingUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership of the booking is checked via BookingUpdatePolicy in the controller.
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'stage' => ['required', Rule::enum(CampaignStage::class)],
            // A photo-only update ("here it is going up!") is fine — but an
            // update must say or show *something*.
            'message' => ['nullable', 'string', 'max:2000', 'required_without:photos'],
            'requires_approval' => ['sometimes', 'boolean'],
            'photos' => ['nullable', 'array', 'max:4'],
            'photos.*' => ['image', 'max:4096'],
        ];
    }
}
