<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Printed on the contract and handed to the campaign manager, so
            // the company has a number to call — set on the customer profile.
            $table->string('phone')->nullable()->after('email');
            // Per-customer opt-outs keyed by App\Enums\EmailTopic values. Null
            // means "everything on", so existing accounts keep receiving mail.
            $table->json('email_preferences')->nullable()->after('phone');
        });

        Schema::table('bookings', function (Blueprint $table) {
            // The salesperson at the billboard company who owns this campaign.
            // Nulled (not cascaded) on user delete so the booking survives an
            // employee leaving — the company just reassigns it.
            $table->foreignId('account_manager_id')->nullable()->after('contact_id')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('account_manager_assigned_at')->nullable()->after('account_manager_id');
        });
    }

    public function down(): void
    {
        Schema::table('bookings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_manager_id');
            $table->dropColumn('account_manager_assigned_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'email_preferences']);
        });
    }
};
