<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Workspace settings (ERP PRD §7), one row per owner, created lazily.
        Schema::create('partner_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->unique()->constrained('users')->cascadeOnDelete();
            $table->string('logo_path')->nullable();
            $table->string('contact_email')->nullable();
            $table->string('contact_phone')->nullable();
            $table->string('working_hours')->nullable(); // free text, e.g. "Mon–Sat 8am–6pm"
            $table->boolean('offers_design')->default(false);
            $table->unsignedInteger('design_price')->nullable(); // KES, per artwork
            $table->boolean('offers_printing')->default(false);
            $table->unsignedInteger('printing_price')->nullable(); // KES, per sqm
            $table->unsignedInteger('installation_price')->nullable(); // KES, per install
            // Days of notice needed before a campaign can start, keyed by
            // BillboardType value. Drives the marketplace's earliest start date.
            $table->json('lead_times')->nullable();
            $table->json('payout')->nullable(); // escrow payout account (demo strings)
            $table->json('notifications')->nullable(); // email/sms/in_app booleans
            $table->boolean('marketplace_visible')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('partner_settings');
    }
};
