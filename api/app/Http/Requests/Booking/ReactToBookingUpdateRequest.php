<?php

namespace App\Http\Requests\Booking;

use App\Enums\ClientReaction;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReactToBookingUpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Ownership of the booking is checked in the controller.
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'reaction' => ['required', Rule::enum(ClientReaction::class)],
            'comment' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
