<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            // Actor identity is denormalised on purpose: the trail must stay
            // readable even if the acting account is later removed.
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('actor_name')->nullable();
            $table->string('actor_email')->nullable();
            $table->string('action')->index(); // e.g. user.suspended
            $table->string('target_type')->nullable();
            $table->unsignedBigInteger('target_id')->nullable();
            $table->string('target_label')->nullable();
            $table->json('changes')->nullable(); // {before: {...}, after: {...}}
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            // Append-only: created_at only, no updated_at. AuditLog also blocks
            // updates and deletes at the model layer.
            $table->timestamp('created_at')->useCurrent()->index();

            $table->index(['target_type', 'target_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
