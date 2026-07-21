<?php

namespace Database\Seeders;

use App\Enums\AdminPermission;
use App\Enums\ArtworkStatus;
use App\Enums\BillboardChannel;
use App\Enums\BookingSource;
use App\Enums\BookingStatus;
use App\Enums\CampaignStage;
use App\Enums\ClientReaction;
use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use App\Models\Artwork;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\BookingUpdate;
use App\Models\Contact;
use App\Models\LoginAttempt;
use App\Models\Payment;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Idempotent: on hosted deploys this runs on every boot, so bail out if
        // the demo data is already present (avoids duplicate-email crashes).
        if (User::where('email', 'admin@tangaza.test')->exists()) {
            return;
        }

        $admin = User::factory()->admin()->create([
            'name' => 'Tangazaa Admin',
            'company_name' => 'Tangazaa',
            'email' => 'admin@tangaza.test',
            'password' => 'password',
        ]);

        // A restricted admin, so the RBAC screens have something real to show:
        // support-desk access only — can read users and bookings, can touch
        // neither money nor other administrators.
        User::factory()->limitedAdmin([
            AdminPermission::UsersView,
            AdminPermission::BookingsView,
            AdminPermission::BookingsManage,
            AdminPermission::BillboardsView,
        ])->create([
            'name' => 'Priya Support',
            'company_name' => 'Tangazaa',
            'email' => 'support@tangaza.test',
            'password' => 'password',
        ]);

        // Personal admin login for the project owner.
        User::factory()->admin()->create([
            'name' => 'Katrina',
            'company_name' => 'Tangazaa',
            'email' => 'alumkatrina58@gmail.com',
            'password' => 'password',
        ]);

        $owner = User::factory()->owner()->create([
            'name' => 'Omar Owner',
            'company_name' => 'Nairobi Outdoor Media',
            'email' => 'owner@tangaza.test',
            'password' => 'password',
        ]);

        $customer = User::factory()->create([
            'name' => 'Jane Customer',
            'company_name' => 'Acme Ads',
            'email' => 'customer@tangaza.test',
            'password' => 'password',
        ]);

        // An employee of the demo owner's company — logs into Tangazaa Partner
        // with their own credentials (never the owner's).
        User::factory()->staffOf($owner)->create([
            'name' => 'Sam Staff',
            'email' => 'staff@tangaza.test',
            'password' => 'password',
        ]);

        $owners = User::factory()->owner()->count(4)->create();
        $customers = User::factory()->count(8)->create();

        // A suspended account, for testing the admin "suspend/reactivate" flow.
        User::factory()->create([
            'name' => 'Suspended Test User',
            'company_name' => 'Flagged Ads Ltd',
            'email' => 'suspended@tangaza.test',
            'password' => 'password',
            'is_suspended' => true,
        ]);

        $allOwners = $owners->push($owner);
        $allCustomers = $customers->push($customer);

        $billboards = $allOwners->flatMap(
            fn (User $billboardOwner) => Billboard::factory()
                ->count(rand(2, 4))
                ->create(['owner_id' => $billboardOwner->id])
        );

        $billboards->random(min(8, $billboards->count()))->each(function (Billboard $billboard) use ($allCustomers) {
            $customer = $allCustomers->random();

            $booking = Booking::factory()->create([
                'billboard_id' => $billboard->id,
                'customer_id' => $customer->id,
                'status' => BookingStatus::Confirmed,
            ]);

            // A confirmed booking has, by definition, been paid for.
            Payment::factory()->paid()->create([
                'booking_id' => $booking->id,
                'amount' => $booking->total_price,
                'email' => $customer->email,
            ]);
        });

        // Curated, real-world Nairobi sites so the browse map is well populated.
        $this->call(NairobiBillboardSeeder::class);

        // Tangazaa Partner demo data for the main owner account, so the ERP
        // screens (CRM, artwork, work orders, sync) aren't empty on first login.
        $contacts = Contact::factory()->count(5)->create(['owner_id' => $owner->id]);
        $ownerBoards = $owner->billboards()->get();

        // One offline-channel board (sold through the owner's own channels, not
        // the app) and one maintenance board, so the ERP map shows every pin
        // colour out of the box. Created after $ownerBoards is captured so the
        // demo bookings below always land on normal online boards.
        Billboard::factory()->create(['owner_id' => $owner->id, 'channel' => BillboardChannel::Offline]);
        Billboard::factory()->create(['owner_id' => $owner->id, 'under_maintenance' => true]);

        if ($ownerBoards->isNotEmpty()) {
            // An offline (walk-in) deal, so the sync screen shows both sources.
            $offlineBoard = $ownerBoards->first();
            Booking::create([
                'billboard_id' => $offlineBoard->id,
                'contact_id' => $contacts->first()->id,
                'start_date' => now()->addMonths(4)->startOfDay(),
                'end_date' => now()->addMonths(5)->startOfDay(),
                'total_price' => 180000,
                'status' => BookingStatus::Confirmed,
                'source' => BookingSource::Offline,
            ]);

            Artwork::factory()->create([
                'owner_id' => $owner->id,
                'contact_id' => $contacts->first()->id,
                'billboard_id' => $offlineBoard->id,
                'title' => $contacts->first()->company.' — main campaign creative',
                'status' => ArtworkStatus::InDesign,
            ]);
            Artwork::factory()->count(3)->create([
                'owner_id' => $owner->id,
                'contact_id' => $contacts->random()->id,
            ]);

            WorkOrder::factory()->create([
                'owner_id' => $owner->id,
                'billboard_id' => $offlineBoard->id,
                'type' => WorkOrderType::Printing,
                'status' => WorkOrderStatus::InProgress,
                'assignee_name' => 'Print shop — Baba Dogo',
            ]);
            WorkOrder::factory()->create([
                'owner_id' => $owner->id,
                'billboard_id' => $ownerBoards->last()->id,
                'type' => WorkOrderType::Installation,
                'status' => WorkOrderStatus::Scheduled,
                'assignee_name' => 'Kevin (installer)',
                'scheduled_for' => now()->addDays(3)->format('Y-m-d'),
            ]);
            WorkOrder::factory()->completed()->create([
                'owner_id' => $owner->id,
                'billboard_id' => $ownerBoards->random()->id,
                'type' => WorkOrderType::Removal,
            ]);

            // A live campaign for the demo customer with a Glovo-style progress
            // timeline already underway, so "Track progress" tells a story on
            // first login — ending on an unanswered go-ahead question so the
            // "action needed" nudge shows too.
            $progressBoard = $ownerBoards->last();
            $progressBooking = Booking::create([
                'billboard_id' => $progressBoard->id,
                'customer_id' => $customer->id,
                'start_date' => now()->subDays(10)->startOfDay(),
                'end_date' => now()->addDays(50)->startOfDay(),
                'total_price' => 240000,
                'status' => BookingStatus::Confirmed,
            ]);
            Payment::factory()->paid()->create([
                'booking_id' => $progressBooking->id,
                'amount' => $progressBooking->total_price,
                'email' => $customer->email,
            ]);

            BookingUpdate::factory()->create([
                'booking_id' => $progressBooking->id,
                'user_id' => $owner->id,
                'stage' => CampaignStage::AgentContact,
                'message' => 'Karibu! I\'m your account manager for this campaign — I\'ll keep you posted here from artwork to installation.',
                'created_at' => now()->subDays(9),
                'updated_at' => now()->subDays(9),
            ]);
            BookingUpdate::factory()->create([
                'booking_id' => $progressBooking->id,
                'user_id' => $owner->id,
                'stage' => CampaignStage::Artwork,
                'message' => 'Your creative is in design — first layout draft coming your way shortly.',
                'created_at' => now()->subDays(7),
                'updated_at' => now()->subDays(7),
            ]);
            BookingUpdate::factory()->create([
                'booking_id' => $progressBooking->id,
                'user_id' => $owner->id,
                'stage' => CampaignStage::Artwork,
                'message' => 'Final artwork ready: 12m × 8m layout in your new brand colours.',
                'client_reaction' => ClientReaction::Liked,
                'client_comment' => 'Looks fantastic — exactly the vibe we wanted.',
                'created_at' => now()->subDays(5),
                'updated_at' => now()->subDays(4),
            ]);
            BookingUpdate::factory()->needsApproval()->create([
                'booking_id' => $progressBooking->id,
                'user_id' => $owner->id,
                'stage' => CampaignStage::Production,
                'message' => 'The artwork is locked. Should we go ahead and print + build your billboard?',
                'created_at' => now()->subDays(2),
                'updated_at' => now()->subDays(2),
            ]);
        }

        // Normal login history.
        foreach ([$admin, $owner, $customer] as $user) {
            LoginAttempt::create([
                'email' => $user->email,
                'user_id' => $user->id,
                'ip_address' => '41.90.64.10',
                'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'successful' => true,
                'is_suspicious' => false,
            ]);
        }

        // A brute-force-looking pattern of failed attempts against the owner account.
        for ($i = 0; $i < 4; $i++) {
            LoginAttempt::create([
                'email' => $owner->email,
                'user_id' => $owner->id,
                'ip_address' => '197.232.58.21',
                'user_agent' => 'curl/8.4.0',
                'successful' => false,
                'is_suspicious' => false,
            ]);
        }
        LoginAttempt::create([
            'email' => $owner->email,
            'user_id' => $owner->id,
            'ip_address' => '197.232.58.21',
            'user_agent' => 'curl/8.4.0',
            'successful' => false,
            'is_suspicious' => true,
            'suspicious_reason' => 'Repeated failed login attempts',
        ]);

        // A successful login from a new IP for the admin (e.g. travelling/new device).
        LoginAttempt::create([
            'email' => $admin->email,
            'user_id' => $admin->id,
            'ip_address' => '102.68.79.4',
            'user_agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
            'successful' => true,
            'is_suspicious' => true,
            'suspicious_reason' => 'Login from a new IP address',
        ]);
    }
}
