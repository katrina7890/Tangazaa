<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\BillboardType;
use App\Http\Controllers\Controller;
use App\Models\PartnerSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Workspace settings (ERP PRD §7). Owner/admin only — payout details and
 * pricing are not staff business. Lead times here drive the marketplace's
 * earliest bookable start date per billboard type.
 */
class SettingsController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return $this->respond($this->settingsFor($request));
    }

    public function update(Request $request): JsonResponse
    {
        $typeKeys = array_column(BillboardType::cases(), 'value');

        $data = $request->validate([
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:40'],
            'working_hours' => ['nullable', 'string', 'max:120'],
            'offers_design' => ['sometimes', 'boolean'],
            'design_price' => ['nullable', 'integer', 'min:0'],
            'offers_printing' => ['sometimes', 'boolean'],
            'printing_price' => ['nullable', 'integer', 'min:0'],
            'installation_price' => ['nullable', 'integer', 'min:0'],
            'lead_times' => ['sometimes', 'array'],
            ...collect($typeKeys)->mapWithKeys(fn ($key) => [
                "lead_times.$key" => ['nullable', 'integer', 'between:0,60'],
            ])->all(),
            'payout' => ['sometimes', 'array'],
            'payout.bank_name' => ['nullable', 'string', 'max:100'],
            'payout.account_name' => ['nullable', 'string', 'max:100'],
            'payout.account_number' => ['nullable', 'string', 'max:40'],
            'notifications' => ['sometimes', 'array'],
            'notifications.email' => ['nullable', 'boolean'],
            'notifications.sms' => ['nullable', 'boolean'],
            'notifications.in_app' => ['nullable', 'boolean'],
            'marketplace_visible' => ['sometimes', 'boolean'],
        ]);

        $settings = $this->settingsFor($request);
        $settings->update($data);

        return $this->respond($settings->refresh());
    }

    public function logo(Request $request): JsonResponse
    {
        $request->validate(['logo' => ['required', 'image', 'max:2048']]);

        $settings = $this->settingsFor($request);
        if ($settings->logo_path) {
            Storage::disk('public')->delete($settings->logo_path);
        }
        $settings->update(['logo_path' => $request->file('logo')->store('logos', 'public')]);

        return $this->respond($settings->refresh());
    }

    private function settingsFor(Request $request): PartnerSetting
    {
        return PartnerSetting::firstOrCreate(
            ['owner_id' => $request->user()->id],
            [
                'lead_times' => PartnerSetting::DEFAULT_LEAD_TIMES,
                'notifications' => ['email' => true, 'sms' => false, 'in_app' => true],
                // Explicit: DB defaults don't hydrate a freshly-created model.
                'marketplace_visible' => true,
            ],
        );
    }

    private function respond(PartnerSetting $settings): JsonResponse
    {
        return response()->json(['data' => [
            'logo_url' => $settings->logo_path ? Storage::disk('public')->url($settings->logo_path) : null,
            'contact_email' => $settings->contact_email,
            'contact_phone' => $settings->contact_phone,
            'working_hours' => $settings->working_hours,
            'offers_design' => $settings->offers_design,
            'design_price' => $settings->design_price,
            'offers_printing' => $settings->offers_printing,
            'printing_price' => $settings->printing_price,
            'installation_price' => $settings->installation_price,
            'lead_times' => array_merge(PartnerSetting::DEFAULT_LEAD_TIMES, $settings->lead_times ?? []),
            'payout' => $settings->payout ?? [],
            'notifications' => $settings->notifications ?? [],
            'marketplace_visible' => $settings->marketplace_visible,
        ]]);
    }
}
