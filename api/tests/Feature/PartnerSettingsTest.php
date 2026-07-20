<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PartnerSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_are_created_lazily_and_updatable_and_staff_are_locked_out(): void
    {
        $owner = User::factory()->owner()->create();

        $this->actingAs($owner)->getJson('/api/partner/settings')
            ->assertOk()
            ->assertJsonPath('data.lead_times.digital_led', 3)
            ->assertJsonPath('data.marketplace_visible', true);

        $this->actingAs($owner)->putJson('/api/partner/settings', [
            'contact_phone' => '+254 700 111 222',
            'offers_design' => true,
            'design_price' => 15000,
            'lead_times' => ['standard_4x3' => 10, 'digital_led' => 2],
            'payout' => ['bank_name' => 'KCB', 'account_name' => 'Nairobi Outdoor', 'account_number' => '1234567890'],
        ])->assertOk()
            ->assertJsonPath('data.offers_design', true)
            ->assertJsonPath('data.lead_times.standard_4x3', 10)
            ->assertJsonPath('data.payout.bank_name', 'KCB');

        $staff = User::factory()->staffOf($owner)->create();
        $this->actingAs($staff)->getJson('/api/partner/settings')->assertForbidden();
    }

    public function test_lead_times_push_the_earliest_marketplace_start_date(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id, 'type' => 'standard_4x3']);

        // Before settings exist: booking can start soon.
        $customer = User::factory()->create();
        $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $billboard->id,
            'start_date' => Carbon::today()->addDays(2)->toDateString(),
            'end_date' => Carbon::today()->addDays(35)->toDateString(),
        ])->assertCreated();

        // Owner configures a 7-day notice for physical boards.
        $this->actingAs($owner)->putJson('/api/partner/settings', [
            'lead_times' => ['standard_4x3' => 7],
        ])->assertOk();

        $second = Billboard::factory()->create(['owner_id' => $owner->id, 'type' => 'standard_4x3']);
        $this->actingAs($customer)->postJson('/api/bookings', [
            'billboard_id' => $second->id,
            'start_date' => Carbon::today()->addDays(2)->toDateString(),
            'end_date' => Carbon::today()->addDays(40)->toDateString(),
        ])->assertJsonValidationErrors('start_date');

        // And the public listing advertises the pushed-out earliest date.
        $listed = collect($this->getJson('/api/billboards')->json('data'))->firstWhere('id', $second->id);
        $this->assertSame(Carbon::today()->addDays(7)->toDateString(), $listed['next_available_from']);
    }

    public function test_marketplace_visibility_toggle_hides_the_whole_portfolio(): void
    {
        $owner = User::factory()->owner()->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($owner)->putJson('/api/partner/settings', ['marketplace_visible' => false])->assertOk();

        $this->assertFalse(
            collect($this->getJson('/api/billboards')->json('data'))->contains('id', $billboard->id),
        );
        $this->getJson("/api/billboards/{$billboard->id}")->assertNotFound();

        $this->actingAs($owner)->putJson('/api/partner/settings', ['marketplace_visible' => true])->assertOk();
        $this->getJson("/api/billboards/{$billboard->id}")->assertOk();
    }
}
