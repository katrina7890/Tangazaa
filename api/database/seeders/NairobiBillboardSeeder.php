<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Enums\UserRole;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo-only: a curated spread of billboards across real Nairobi areas so the
 * browse map looks populated for presentations. Coordinates are approximate.
 * Safe to run on its own (`db:seed --class=NairobiBillboardSeeder`) — it attaches
 * to existing owners/customers and skips sites it has already created.
 */
class NairobiBillboardSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $owners = User::where('role', UserRole::Owner->value)->get();
        if ($owners->isEmpty()) {
            $owners = collect([User::factory()->owner()->create()]);
        }
        $customers = User::where('role', UserRole::Customer->value)->get();

        foreach ($this->sites() as $index => $site) {
            // Idempotent: don't duplicate a site if this seeder has already run.
            if (Billboard::where('title', $site['title'])->exists()) {
                continue;
            }

            $billboard = Billboard::create([
                'owner_id' => $owners[$index % $owners->count()]->id,
                'title' => $site['title'],
                'location' => $site['location'],
                'lat' => $site['lat'],
                'lng' => $site['lng'],
                'size' => $site['size'],
                'type' => $site['type'],
                'price_per_day' => $site['price_per_day'],
                // Weekly rate carries a small volume discount vs. 7× daily.
                'price_per_week' => (int) (round($site['price_per_day'] * 6 / 500) * 500),
                'description' => $site['description'],
                'is_active' => true,
            ]);

            // Give roughly every third site a live booking so availability varies.
            if ($customers->isNotEmpty() && $index % 3 === 0) {
                $start = Carbon::today()->addDays(7 + $index);
                $end = (clone $start)->addDays(34);

                Booking::create([
                    'billboard_id' => $billboard->id,
                    'customer_id' => $customers->random()->id,
                    'start_date' => $start->toDateString(),
                    'end_date' => $end->toDateString(),
                    'total_price' => $start->diffInDays($end) * $site['price_per_day'],
                    'status' => BookingStatus::Confirmed,
                ]);
            }
        }
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function sites(): array
    {
        $led = 'digital_led';
        $std = 'standard_4x3';
        $gantry = 'gantry';
        $wall = 'wall_wrap';

        return [
            ['title' => 'Waiyaki Way Gantry', 'location' => 'Westlands', 'lat' => -1.2676, 'lng' => 36.8085, 'type' => $gantry, 'size' => '14ft x 48ft', 'price_per_day' => 11000, 'description' => 'Overhead gantry on Waiyaki Way catching heavy inbound CBD traffic from Westlands.'],
            ['title' => 'Westlands Roundabout LED', 'location' => 'Westlands', 'lat' => -1.2655, 'lng' => 36.8120, 'type' => $led, 'size' => '10ft x 20ft', 'price_per_day' => 16000, 'description' => 'Full-colour digital LED at the Westlands roundabout — premium nightlife and retail audience.'],
            ['title' => 'Kenyatta Avenue Board', 'location' => 'CBD', 'lat' => -1.2841, 'lng' => 36.8230, 'type' => $std, 'size' => '10ft x 20ft', 'price_per_day' => 7000, 'description' => 'Classic static board in the heart of the CBD with constant pedestrian and matatu footfall.'],
            ['title' => 'Uhuru Highway Gantry', 'location' => 'CBD', 'lat' => -1.2920, 'lng' => 36.8200, 'type' => $gantry, 'size' => '14ft x 48ft', 'price_per_day' => 12000, 'description' => 'Major gantry spanning Uhuru Highway — one of the busiest corridors in the city.'],
            ['title' => 'Haile Selassie Wall Wrap', 'location' => 'CBD', 'lat' => -1.2890, 'lng' => 36.8270, 'type' => $wall, 'size' => '30ft x 40ft', 'price_per_day' => 9000, 'description' => 'Large building wall wrap visible along Haile Selassie Avenue and the railway approach.'],
            ['title' => 'Mombasa Road LED (GM)', 'location' => 'Mombasa Road', 'lat' => -1.3220, 'lng' => 36.8520, 'type' => $led, 'size' => '12ft x 24ft', 'price_per_day' => 15000, 'description' => 'High-brightness LED near the GM roundabout on the airport-bound Mombasa Road artery.'],
            ['title' => 'Nyayo Roundabout Gantry', 'location' => 'Mombasa Road', 'lat' => -1.3030, 'lng' => 36.8270, 'type' => $gantry, 'size' => '14ft x 40ft', 'price_per_day' => 12500, 'description' => 'Gantry at Nyayo Stadium roundabout — caught by traffic from four major directions.'],
            ['title' => 'Thika Road Mall Gantry', 'location' => 'Thika Road', 'lat' => -1.2195, 'lng' => 36.8885, 'type' => $gantry, 'size' => '14ft x 48ft', 'price_per_day' => 13000, 'description' => 'Superhighway gantry beside TRM with very high daily vehicle volumes.'],
            ['title' => 'Pangani Flyover Board', 'location' => 'Thika Road', 'lat' => -1.2680, 'lng' => 36.8350, 'type' => $std, 'size' => '12ft x 24ft', 'price_per_day' => 6500, 'description' => 'Static board at the Pangani interchange feeding into Thika Road and Murang\'a Road.'],
            ['title' => 'Ngong Road Prestige Board', 'location' => 'Ngong Road', 'lat' => -1.2998, 'lng' => 36.7815, 'type' => $std, 'size' => '10ft x 20ft', 'price_per_day' => 6000, 'description' => 'Roadside board on Ngong Road near Prestige Plaza, strong Kilimani retail catchment.'],
            ['title' => 'Yaya Centre LED', 'location' => 'Kilimani', 'lat' => -1.2935, 'lng' => 36.7850, 'type' => $led, 'size' => '10ft x 20ft', 'price_per_day' => 13000, 'description' => 'Digital LED outside Yaya Centre reaching an upmarket Kilimani / Hurlingham audience.'],
            ['title' => 'Upper Hill Tower Wrap', 'location' => 'Upper Hill', 'lat' => -1.2985, 'lng' => 36.8120, 'type' => $wall, 'size' => '40ft x 60ft', 'price_per_day' => 11000, 'description' => 'Premium office-tower wall wrap in the Upper Hill financial district.'],
            ['title' => 'Lang\'ata Road Board', 'location' => 'Lang\'ata', 'lat' => -1.3290, 'lng' => 36.8030, 'type' => $std, 'size' => '12ft x 24ft', 'price_per_day' => 5500, 'description' => 'Static board on Lang\'ata Road near Wilson Airport and the Nyayo estates.'],
            ['title' => 'Karen Crossroads Board', 'location' => 'Karen', 'lat' => -1.3370, 'lng' => 36.7060, 'type' => $std, 'size' => '8ft x 16ft', 'price_per_day' => 4500, 'description' => 'Leafy Karen shopping-district board with an affluent, low-competition audience.'],
            ['title' => 'Gigiri UN Avenue Wrap', 'location' => 'Gigiri', 'lat' => -1.2330, 'lng' => 36.8120, 'type' => $wall, 'size' => '20ft x 30ft', 'price_per_day' => 8000, 'description' => 'Wall wrap near the UN complex and diplomatic offices in Gigiri.'],
            ['title' => 'Parklands 3rd Avenue', 'location' => 'Parklands', 'lat' => -1.2625, 'lng' => 36.8330, 'type' => $std, 'size' => '10ft x 20ft', 'price_per_day' => 6000, 'description' => 'Busy Parklands board surrounded by clinics, schools and retail.'],
            ['title' => 'South B Shopping Centre', 'location' => 'South B', 'lat' => -1.3085, 'lng' => 36.8385, 'type' => $std, 'size' => '8ft x 16ft', 'price_per_day' => 5000, 'description' => 'Neighbourhood board at South B shopping centre with steady residential traffic.'],
            ['title' => 'Airport North Road LED', 'location' => 'Embakasi', 'lat' => -1.3235, 'lng' => 36.8930, 'type' => $led, 'size' => '12ft x 24ft', 'price_per_day' => 14000, 'description' => 'Digital LED on Airport North Road serving JKIA-bound travellers and freight.'],
            ['title' => 'Kasarani Stadium Gantry', 'location' => 'Kasarani', 'lat' => -1.2210, 'lng' => 36.8970, 'type' => $gantry, 'size' => '14ft x 40ft', 'price_per_day' => 9000, 'description' => 'Gantry near Kasarani Stadium — spikes on match and event days.'],
            ['title' => 'Lavington Green Board', 'location' => 'Lavington', 'lat' => -1.2790, 'lng' => 36.7665, 'type' => $std, 'size' => '10ft x 20ft', 'price_per_day' => 6500, 'description' => 'Static board by Lavington Green mall in a high-income residential pocket.'],
        ];
    }
}
