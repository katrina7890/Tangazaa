<?php

namespace App\Http\Requests\Partner;

use App\Enums\ArtworkStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreArtworkRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            // Linked records must belong to the same owner workspace.
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
            'status' => ['nullable', Rule::enum(ArtworkStatus::class)],
            'due_date' => ['nullable', 'date'],
            'file_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
