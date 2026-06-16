<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\LoginAttempt;
use App\Models\User;
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
        $admin = User::factory()->admin()->create([
            'name' => 'Tangazaa Admin',
            'company_name' => 'Tangazaa',
            'email' => 'admin@tangaza.test',
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
            Booking::factory()->create([
                'billboard_id' => $billboard->id,
                'customer_id' => $allCustomers->random()->id,
                'status' => BookingStatus::Confirmed,
            ]);
        });

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
