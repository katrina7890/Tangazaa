<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('billboards', function (Blueprint $table) {
            // Rich inventory attributes (ERP PRD §3). All optional — legacy
            // rows and quick listings stay valid.
            $table->unsignedTinyInteger('discount_pct')->nullable()->after('price_per_week');
            $table->string('lighting')->nullable()->after('size'); // front_lit|back_lit|led|none
            $table->string('orientation')->nullable()->after('lighting'); // landscape|portrait
            $table->string('road')->nullable()->after('location');
            $table->unsignedInteger('daily_traffic')->nullable()->after('orientation');
            $table->json('tags')->nullable()->after('description');
            $table->json('amenities')->nullable()->after('tags');
            $table->unsignedTinyInteger('visibility_score')->nullable()->after('daily_traffic'); // 1–10
            // Archived boards leave the marketplace and the day-to-day ERP views
            // but keep their history (soft business-level archive, not deletion).
            $table->timestamp('archived_at')->nullable()->after('under_maintenance');
        });
    }

    public function down(): void
    {
        Schema::table('billboards', function (Blueprint $table) {
            $table->dropColumn([
                'discount_pct', 'lighting', 'orientation', 'road', 'daily_traffic',
                'tags', 'amenities', 'visibility_score', 'archived_at',
            ]);
        });
    }
};
