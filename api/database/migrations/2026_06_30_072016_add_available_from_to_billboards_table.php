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
            // The date the owner first makes the billboard bookable from. Nullable
            // so existing rows / seed data without it stay valid — the API treats a
            // null value as "available from today". From here the app derives the
            // *next* free date automatically by walking past confirmed bookings.
            $table->date('available_from')->nullable()->after('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('billboards', function (Blueprint $table) {
            $table->dropColumn('available_from');
        });
    }
};
