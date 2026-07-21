<?php

namespace App\Http\Requests;

use App\Enums\EmailTopic;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'company_name' => ['nullable', 'string', 'max:255'],
            'email' => [
                'required', 'email', 'max:255',
                Rule::unique('users', 'email')->ignore($this->user()->id),
            ],
            'phone' => ['nullable', 'string', 'max:40'],

            // Opt-outs arrive as a full {topic: bool} map so a cleared checkbox
            // is distinguishable from an absent key.
            'email_preferences' => ['nullable', 'array'],
            'email_preferences.*' => ['boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                $known = array_column(EmailTopic::cases(), 'value');

                foreach (array_keys($this->input('email_preferences') ?? []) as $topic) {
                    if (! in_array($topic, $known, true)) {
                        $validator->errors()->add('email_preferences', "Unknown email topic: {$topic}.");
                    }
                }
            },
        ];
    }
}
