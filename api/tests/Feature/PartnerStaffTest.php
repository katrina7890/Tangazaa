<?php

namespace Tests\Feature;

use App\Models\Billboard;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PartnerStaffTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_see_their_employers_partner_data(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        Contact::factory()->count(2)->create(['owner_id' => $owner->id]);
        Contact::factory()->create(); // another company's contact

        $response = $this->actingAs($staff)->getJson('/api/partner/contacts');

        $response->assertOk();
        $response->assertJsonCount(2, 'data');
    }

    public function test_records_created_by_staff_belong_to_the_employer(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();

        $this->actingAs($staff)->postJson('/api/partner/contacts', [
            'name' => 'Walk-in Wendy',
        ])->assertCreated();

        $this->assertDatabaseHas('contacts', [
            'name' => 'Walk-in Wendy',
            'owner_id' => $owner->id,
        ]);
    }

    public function test_staff_can_update_employer_records_but_not_other_companies(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        $ours = Contact::factory()->create(['owner_id' => $owner->id]);
        $theirs = Contact::factory()->create();

        $this->actingAs($staff)
            ->putJson("/api/partner/contacts/{$ours->id}", ['name' => 'Updated By Staff'])
            ->assertOk();

        $this->actingAs($staff)
            ->putJson("/api/partner/contacts/{$theirs->id}", ['name' => 'Hijacked'])
            ->assertForbidden();
    }

    public function test_staff_can_read_but_not_manage_the_employers_billboards(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);

        $list = $this->actingAs($staff)->getJson('/api/my/billboards');
        $list->assertOk();
        $list->assertJsonCount(1, 'data');

        $this->actingAs($staff)->deleteJson("/api/billboards/{$billboard->id}")->assertForbidden();
        $this->actingAs($staff)->postJson('/api/billboards', [])->assertForbidden();
    }

    public function test_staff_do_not_see_the_companys_revenue(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        Billboard::factory()->create(['owner_id' => $owner->id]);

        $asOwner = $this->actingAs($owner)->getJson('/api/partner/overview');
        $this->assertIsInt($asOwner->json('stats.confirmed_revenue'));

        $asStaff = $this->actingAs($staff)->getJson('/api/partner/overview');
        $asStaff->assertOk();
        $this->assertNull($asStaff->json('stats.confirmed_revenue'));
    }

    public function test_staff_can_record_an_offline_booking_for_the_employer(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();
        $billboard = Billboard::factory()->create(['owner_id' => $owner->id]);
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($staff)->postJson('/api/partner/offline-bookings', [
            'billboard_id' => $billboard->id,
            'contact_id' => $contact->id,
            'start_date' => Carbon::today()->addDays(5)->toDateString(),
            'end_date' => Carbon::today()->addDays(20)->toDateString(),
        ])->assertCreated();
    }

    public function test_staff_cannot_touch_team_management_or_admin_areas(): void
    {
        $owner = User::factory()->owner()->create();
        $staff = User::factory()->staffOf($owner)->create();

        $this->actingAs($staff)->getJson('/api/partner/team')->assertForbidden();
        $this->actingAs($staff)->postJson('/api/partner/team', [])->assertForbidden();
        $this->actingAs($staff)->getJson('/api/admin/stats')->assertForbidden();
    }

    public function test_nobody_can_self_register_as_staff(): void
    {
        $this->postJson('/api/register', [
            'company_name' => 'Sneaky Co',
            'name' => 'Sneaky Sam',
            'email' => 'sneaky@example.com',
            'password' => 'password123',
            'role' => 'staff',
        ])->assertJsonValidationErrors('role');
    }
}
