<?php

namespace Tests\Feature;

use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerContactTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_owner_can_create_and_list_contacts(): void
    {
        $owner = User::factory()->owner()->create();

        $this->actingAs($owner)->postJson('/api/partner/contacts', [
            'name' => 'Grace Wanjiku',
            'company' => 'Safarilink Adverts',
            'email' => 'grace@safarilink.co.ke',
            'phone' => '+254712345678',
        ])->assertCreated();

        $response = $this->actingAs($owner)->getJson('/api/partner/contacts');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Grace Wanjiku');
    }

    public function test_contacts_are_scoped_to_their_owner(): void
    {
        $owner = User::factory()->owner()->create();
        Contact::factory()->create(); // belongs to somebody else

        $response = $this->actingAs($owner)->getJson('/api/partner/contacts');

        $response->assertOk();
        $response->assertJsonCount(0, 'data');
    }

    public function test_contacts_can_be_searched(): void
    {
        $owner = User::factory()->owner()->create();
        Contact::factory()->create(['owner_id' => $owner->id, 'name' => 'Grace Wanjiku']);
        Contact::factory()->create(['owner_id' => $owner->id, 'name' => 'Brian Otieno']);

        $response = $this->actingAs($owner)->getJson('/api/partner/contacts?search=grace');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.name', 'Grace Wanjiku');
    }

    public function test_an_owner_cannot_update_another_owners_contact(): void
    {
        $owner = User::factory()->owner()->create();
        $foreign = Contact::factory()->create();

        $this->actingAs($owner)
            ->putJson("/api/partner/contacts/{$foreign->id}", ['name' => 'Hijacked'])
            ->assertForbidden();
    }

    public function test_an_owner_can_update_and_delete_their_contact(): void
    {
        $owner = User::factory()->owner()->create();
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        $this->actingAs($owner)
            ->putJson("/api/partner/contacts/{$contact->id}", ['name' => 'Renamed Contact'])
            ->assertOk()
            ->assertJsonPath('data.name', 'Renamed Contact');

        $this->actingAs($owner)
            ->deleteJson("/api/partner/contacts/{$contact->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('contacts', ['id' => $contact->id]);
    }

    public function test_customers_cannot_access_partner_endpoints(): void
    {
        $customer = User::factory()->create();

        $this->actingAs($customer)->getJson('/api/partner/contacts')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/partner/overview')->assertForbidden();
        $this->actingAs($customer)->getJson('/api/partner/work-orders')->assertForbidden();
    }
}
