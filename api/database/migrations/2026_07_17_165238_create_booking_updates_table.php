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
        Schema::create('booking_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            // The partner user (owner or staff) who posted the update.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('stage'); // App\Enums\CampaignStage
            $table->text('message')->nullable();
            // Paths on the public disk — an update can be photo-only.
            $table->json('photos')->nullable();
            // "Should we go ahead?" — the customer must answer before work continues.
            $table->boolean('requires_approval')->default(false);
            $table->string('client_reaction')->nullable(); // App\Enums\ClientReaction
            $table->text('client_comment')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_updates');
    }
};
