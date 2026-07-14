<?php

namespace Tests\Feature;

use App\Models\Artwork;
use App\Models\Contact;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartnerArtworkTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_owner_can_create_an_artwork_linked_to_their_contact(): void
    {
        $owner = User::factory()->owner()->create();
        $contact = Contact::factory()->create(['owner_id' => $owner->id]);

        $response = $this->actingAs($owner)->postJson('/api/partner/artworks', [
            'title' => 'Safaricom 5G launch creative',
            'contact_id' => $contact->id,
            'status' => 'brief',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.status', 'brief');
        $response->assertJsonPath('data.contact.name', $contact->name);
    }

    public function test_an_artwork_cannot_reference_another_owners_contact(): void
    {
        $owner = User::factory()->owner()->create();
        $foreignContact = Contact::factory()->create();

        $this->actingAs($owner)->postJson('/api/partner/artworks', [
            'title' => 'Sneaky link',
            'contact_id' => $foreignContact->id,
        ])->assertJsonValidationErrors('contact_id');
    }

    public function test_an_owner_can_move_an_artwork_through_the_workflow(): void
    {
        $owner = User::factory()->owner()->create();
        $artwork = Artwork::factory()->create(['owner_id' => $owner->id, 'status' => 'brief']);

        $this->actingAs($owner)
            ->patchJson("/api/partner/artworks/{$artwork->id}", ['status' => 'in_design'])
            ->assertOk()
            ->assertJsonPath('data.status', 'in_design');

        $this->actingAs($owner)
            ->patchJson("/api/partner/artworks/{$artwork->id}", ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');
    }

    public function test_artworks_can_be_filtered_by_status(): void
    {
        $owner = User::factory()->owner()->create();
        Artwork::factory()->create(['owner_id' => $owner->id, 'status' => 'brief']);
        Artwork::factory()->create(['owner_id' => $owner->id, 'status' => 'approved']);

        $response = $this->actingAs($owner)->getJson('/api/partner/artworks?status=approved');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.status', 'approved');
    }

    public function test_an_owner_cannot_touch_another_owners_artwork(): void
    {
        $owner = User::factory()->owner()->create();
        $foreign = Artwork::factory()->create();

        $this->actingAs($owner)
            ->patchJson("/api/partner/artworks/{$foreign->id}", ['status' => 'approved'])
            ->assertForbidden();

        $this->actingAs($owner)
            ->deleteJson("/api/partner/artworks/{$foreign->id}")
            ->assertForbidden();
    }
}
