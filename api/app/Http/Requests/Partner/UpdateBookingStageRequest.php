<?php

namespace App\Http\Requests\Partner;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateBookingStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership of the booking is checked via BookingStagePolicy in the controller.
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'completed' => ['sometimes', 'boolean'],
            'substatus' => ['sometimes', 'nullable', 'string', 'max:50'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
            // Must be someone in this workspace: the owner or one of their staff.
            'assigned_to' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('id', $this->user()->partnerOwnerId())
                    ->orWhere('employer_id', $this->user()->partnerOwnerId())),
            ],
            'photos' => ['nullable', 'array', 'max:4'],
            'photos.*' => ['image', 'max:4096'],
        ];
    }
}
