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
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('booking_id')->constrained()->cascadeOnDelete();
            // Paystack-style transaction reference we hand to the (simulated) gateway.
            $table->string('reference')->unique();
            // Amount in KES, mirroring bookings.total_price (Paystack proper bills in
            // the minor unit; we keep KES here so the demo numbers line up 1:1).
            $table->unsignedInteger('amount');
            $table->string('email');
            $table->string('channel')->default('card');
            $table->string('status')->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
