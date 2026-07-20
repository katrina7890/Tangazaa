<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('billboards', function (Blueprint $table) {
            // `online` boards are listed on the Tangazaa marketplace; `offline`
            // boards are managed in the Partner ERP but sold through the
            // owner's own channels and never shown to app customers.
            $table->string('channel')->default('online')->after('is_active');
            // Under maintenance = temporarily unbookable and flagged on the map.
            $table->boolean('under_maintenance')->default(false)->after('channel');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('billboards', function (Blueprint $table) {
            $table->dropColumn(['channel', 'under_maintenance']);
        });
    }
};
