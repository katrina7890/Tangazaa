<?php

namespace App\Enums;

/**
 * Granular admin capabilities (RBAC). Super Admins implicitly hold every
 * permission; ordinary admins hold only what a Super Admin grants them.
 *
 * Adding a case here is deliberately cheap — routes reference these values
 * through the `permission:` middleware, so a new capability is one enum case
 * plus one route guard.
 */
enum AdminPermission: string
{
    case UsersView = 'users.view';
    case UsersManage = 'users.manage';
    case AdminsManage = 'admins.manage';
    case BillboardsView = 'billboards.view';
    case BillboardsModerate = 'billboards.moderate';
    case BookingsView = 'bookings.view';
    case BookingsManage = 'bookings.manage';
    case FinanceView = 'finance.view';
    case FinanceManage = 'finance.manage';
    case ReportsView = 'reports.view';
    case AuditView = 'audit.view';
    case SettingsManage = 'settings.manage';

    public function label(): string
    {
        return match ($this) {
            self::UsersView => 'View users',
            self::UsersManage => 'Manage users (suspend, restore, verify)',
            self::AdminsManage => 'Manage administrators & permissions',
            self::BillboardsView => 'View billboards',
            self::BillboardsModerate => 'Moderate billboards (approve, reject, deactivate)',
            self::BookingsView => 'View bookings',
            self::BookingsManage => 'Manage bookings (cancel, modify, reschedule)',
            self::FinanceView => 'View financial records',
            self::FinanceManage => 'Manage money (refunds, payouts, settlements)',
            self::ReportsView => 'View and export reports',
            self::AuditView => 'View audit logs',
            self::SettingsManage => 'Manage platform settings',
        };
    }

    /** Grouping for the permissions matrix in the admin UI. */
    public function group(): string
    {
        return match ($this) {
            self::UsersView, self::UsersManage, self::AdminsManage => 'People',
            self::BillboardsView, self::BillboardsModerate => 'Inventory',
            self::BookingsView, self::BookingsManage => 'Bookings',
            self::FinanceView, self::FinanceManage => 'Finance',
            self::ReportsView, self::AuditView => 'Insight',
            self::SettingsManage => 'Platform',
        };
    }

    /**
     * Permissions that move money or grant power — these always require a
     * fresh re-authentication and are never granted implicitly.
     *
     * @return array<int, self>
     */
    public static function highRisk(): array
    {
        return [self::AdminsManage, self::FinanceManage, self::SettingsManage];
    }
}
