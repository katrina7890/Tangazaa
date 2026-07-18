<?php

namespace App\Http\Requests\Partner;

use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateWorkOrderRequest extends FormRequest
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
            'artwork_id' => [
                'nullable',
                'integer',
                Rule::exists('artworks', 'id')->where('owner_id', $this->user()->partnerOwnerId()),
            ],
            'type' => ['sometimes', Rule::enum(WorkOrderType::class)],
            'status' => ['sometimes', Rule::enum(WorkOrderStatus::class)],
            'assignee_name' => ['nullable', 'string', 'max:255'],
            'scheduled_for' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
