<?php

namespace App\Http\Requests\Partner;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignAccountManagerRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            // Null unassigns. Anyone assigned must be in this workspace — the
            // owner themselves or one of their staff — so a company can't put
            // a rival's employee (or an admin) in front of their client.
            'account_manager_id' => [
                'present',
                'nullable',
                'integer',
                Rule::exists('users', 'id')->where(fn ($query) => $query
                    ->where('id', $this->user()->partnerOwnerId())
                    ->orWhere('employer_id', $this->user()->partnerOwnerId())),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'account_manager_id.exists' => 'You can only assign someone on your own team.',
        ];
    }
}
