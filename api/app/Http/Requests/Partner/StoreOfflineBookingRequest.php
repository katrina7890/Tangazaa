<?php

namespace App\Http\Requests\Partner;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOfflineBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'billboard_id' => [
                'required',
                'integer',
                Rule::exists('billboards', 'id')->where('owner_id', $this->user()->id),
            ],
            'contact_id' => [
                'required',
                'integer',
                Rule::exists('contacts', 'id')->where('owner_id', $this->user()->id),
            ],
            // Offline deals may already be running, so a past start date is fine.
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            // Negotiated off-app — the owner may record whatever was agreed.
            'total_price' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
