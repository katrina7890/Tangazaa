<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // RBAC: Super Admins hold every permission implicitly; ordinary
            // admins hold only the granted subset in `admin_permissions`.
            $table->boolean('is_super_admin')->default(false)->after('role');
            $table->json('admin_permissions')->nullable()->after('is_super_admin');
            // Brute-force lockout — set by the login flow, cleared by expiry
            // or by an admin with users.manage.
            $table->timestamp('locked_until')->nullable()->after('is_suspended');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_super_admin', 'admin_permissions', 'locked_until']);
        });
    }
};
