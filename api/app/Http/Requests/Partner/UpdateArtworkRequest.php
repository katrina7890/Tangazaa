<?php

namespace App\Http\Requests\Partner;

use App\Enums\ArtworkStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateArtworkRequest extends FormRequest
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
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'contact_id' => [
                'nullable',
                'integer',
                Rule::exists('contacts', 'id')->where('owner_id', $this->user()->partnerOwnerId()),
            ],
            'billboard_id' => [
                'nullable',
                'integer',
                Rule::exists('billboards', 'id')->where('owner_id', $this->user()->partnerOwnerId()),
            ],
            'status' => ['sometimes', Rule::enum(ArtworkStatus::class)],
            'due_date' => ['nullable', 'date'],
            'file_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
