<?php

namespace App\Http\Controllers\Api;

use App\Enums\EmailTopic;
use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /** The opt-out catalogue the SPA renders as toggles. */
    public function emailTopics(Request $request): JsonResponse
    {
        $preferences = $request->user()->email_preferences ?? [];

        return response()->json([
            'data' => array_map(fn (EmailTopic $topic) => [
                'value' => $topic->value,
                'label' => $topic->label(),
                'description' => $topic->description(),
                'enabled' => ($preferences[$topic->value] ?? true) === true,
            ], EmailTopic::cases()),
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();
        $data = $request->validated();
        $emailChanged = $data['email'] !== $user->email;

        $user->fill([
            'name' => $data['name'],
            'company_name' => $data['company_name'] ?? $user->company_name,
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
        ]);

        if (array_key_exists('email_preferences', $data)) {
            // Store the full map so a topic added later defaults to opted-in
            // rather than inheriting a stale false.
            $user->email_preferences = array_map(
                fn ($enabled) => (bool) $enabled,
                $data['email_preferences'] ?? [],
            );
        }

        // A new address is unproven, so verification starts over.
        if ($emailChanged) {
            $user->email_verified_at = null;
        }

        $user->save();

        if ($emailChanged) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json(['user' => $user->fresh()]);
    }
}
