<?php

use App\Http\Controllers\Api\Admin\AccessControlController;
use App\Http\Controllers\Api\Admin\AuditLogController;
use App\Http\Controllers\Api\Admin\BillboardController as AdminBillboardController;
use App\Http\Controllers\Api\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\SecurityController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillboardController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Partner\AccountManagerController;
use App\Http\Controllers\Api\Partner\AnalyticsController;
use App\Http\Controllers\Api\Partner\ArtworkController;
use App\Http\Controllers\Api\Partner\BookingPipelineController;
use App\Http\Controllers\Api\Partner\BookingUpdateController;
use App\Http\Controllers\Api\Partner\ChatController;
use App\Http\Controllers\Api\Partner\ContactController;
use App\Http\Controllers\Api\Partner\OfflineBookingController;
use App\Http\Controllers\Api\Partner\OverviewController;
use App\Http\Controllers\Api\Partner\ReminderController;
use App\Http\Controllers\Api\Partner\SettingsController;
use App\Http\Controllers\Api\Partner\TeamController;
use App\Http\Controllers\Api\Partner\WorkOrderController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ProfileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Credential endpoints are throttled per email+IP and per IP (see
// AppServiceProvider) on top of the per-account lockout.
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:register');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

// Signed link from the verification email. Deliberately unauthenticated: the
// link is often opened in a different browser (or a webmail preview) from the
// one that signed up. It validates the signature, then bounces to the SPA.
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

Route::get('/billboards', [BillboardController::class, 'index']);
Route::get('/billboards/{billboard}', [BillboardController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Account profile + which transactional emails this user still wants.
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::get('/profile/email-topics', [ProfileController::class, 'emailTopics']);
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])
        ->middleware('throttle:6,1');

    // In-app notifications (any signed-in role; currently produced for owners).
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    Route::middleware('role:owner,admin')->group(function () {
        Route::post('/billboards', [BillboardController::class, 'store']);
        Route::put('/billboards/{billboard}', [BillboardController::class, 'update']);
        Route::delete('/billboards/{billboard}', [BillboardController::class, 'destroy']);
        Route::get('/billboards/{billboard}/bookings', [BillboardController::class, 'bookings']);

        // Workspace settings (PRD §7): pricing, lead times, payout — owner-only.
        Route::get('/partner/settings', [SettingsController::class, 'show']);
        Route::put('/partner/settings', [SettingsController::class, 'update']);
        Route::post('/partner/settings/logo', [SettingsController::class, 'logo']);

        // Staff accounts are created by their owner here — never self-registered.
        Route::get('/partner/team', [TeamController::class, 'index']);
        Route::post('/partner/team', [TeamController::class, 'store']);
        Route::delete('/partner/team/{member}', [TeamController::class, 'destroy']);
    });

    // Tangazaa Partner — the lightweight ERP for billboard companies. Staff
    // accounts share the workspace (scoped to their employer via partnerOwner())
    // but never the owner's login, dashboard, or revenue figures.
    Route::middleware('role:owner,admin,staff')->group(function () {
        Route::get('/my/billboards', [BillboardController::class, 'mine']);

        Route::prefix('partner')->group(function () {
            Route::get('/overview', OverviewController::class);

            Route::get('/analytics', AnalyticsController::class);

            Route::get('/contacts', [ContactController::class, 'index']);
            Route::get('/contacts/{contact}', [ContactController::class, 'show']);
            Route::post('/contacts', [ContactController::class, 'store']);
            Route::put('/contacts/{contact}', [ContactController::class, 'update']);
            Route::delete('/contacts/{contact}', [ContactController::class, 'destroy']);

            Route::get('/artworks', [ArtworkController::class, 'index']);
            Route::post('/artworks', [ArtworkController::class, 'store']);
            Route::patch('/artworks/{artwork}', [ArtworkController::class, 'update']);
            Route::delete('/artworks/{artwork}', [ArtworkController::class, 'destroy']);

            Route::get('/work-orders', [WorkOrderController::class, 'index']);
            Route::post('/work-orders', [WorkOrderController::class, 'store']);
            Route::patch('/work-orders/{workOrder}', [WorkOrderController::class, 'update']);
            Route::delete('/work-orders/{workOrder}', [WorkOrderController::class, 'destroy']);

            Route::get('/bookings', [OfflineBookingController::class, 'index']);
            Route::get('/bookings/{booking}', [OfflineBookingController::class, 'show']);
            Route::post('/offline-bookings', [OfflineBookingController::class, 'store']);

            // The 7-stage operational pipeline (the ERP's package-tracking view).
            // Stage writes are POST (not PATCH) because PHP won't parse
            // multipart bodies on PATCH and stages accept photo uploads.
            Route::get('/bookings/{booking}/pipeline', [BookingPipelineController::class, 'show']);
            Route::post('/bookings/{booking}/pipeline/{stage}', [BookingPipelineController::class, 'update']);

            // Name the salesperson who owns this campaign — emails the client
            // an introduction with that person's contact details.
            Route::patch('/bookings/{booking}/account-manager', [AccountManagerController::class, 'update']);

            // Computed to-dos: overdue artwork/printing, installs due, payouts.
            Route::get('/reminders', ReminderController::class);

            // Chat Centre — one conversation per booking (PRD §5).
            Route::get('/chats', [ChatController::class, 'index']);
            Route::get('/bookings/{booking}/messages', [ChatController::class, 'show']);
            Route::post('/bookings/{booking}/messages', [ChatController::class, 'store']);

            // Campaign progress tracker — the company posts Glovo-style stage
            // updates (with photos) that the customer follows on their dashboard.
            Route::get('/bookings/{booking}/updates', [BookingUpdateController::class, 'index']);
            Route::post('/bookings/{booking}/updates', [BookingUpdateController::class, 'store']);
            Route::delete('/booking-updates/{update}', [BookingUpdateController::class, 'destroy']);
        });
    });

    Route::middleware('role:customer')->group(function () {
        Route::post('/bookings', [BookingController::class, 'store']);
        Route::get('/my/bookings', [BookingController::class, 'mine']);
        Route::patch('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);

        // Campaign progress tracker (customer side): follow the timeline and
        // answer the company's updates (approve / like / request changes).
        Route::get('/bookings/{booking}/updates', [BookingController::class, 'updates']);
        Route::patch('/booking-updates/{update}/react', [BookingController::class, 'reactToUpdate']);

        // Chat with the billboard company about a booking.
        Route::get('/my/chats', [BookingController::class, 'chats']);
        Route::get('/bookings/{booking}/messages', [BookingController::class, 'messages']);
        Route::post('/bookings/{booking}/messages', [BookingController::class, 'sendMessage']);

        // Simulated Paystack checkout.
        Route::get('/my/payments', [PaymentController::class, 'mine']);
        Route::post('/bookings/{booking}/pay', [PaymentController::class, 'initialize']);
        Route::post('/payments/{reference}/verify', [PaymentController::class, 'verify']);

        // Paperwork: contracts and receipts, rendered to PDF on request.
        Route::get('/my/documents', [DocumentController::class, 'index']);
        Route::get('/bookings/{booking}/documents/contract', [DocumentController::class, 'contract']);
        Route::get('/payments/{reference}/receipt', [DocumentController::class, 'receipt']);
    });

    // Platform admin console. Every route names the capability it requires —
    // `role:admin` alone is never sufficient (RBAC, see App\Enums\AdminPermission).
    Route::middleware(['role:admin', 'throttle:admin'])->prefix('admin')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/login-attempts', [DashboardController::class, 'loginAttempts'])
            ->middleware('permission:audit.view');

        Route::get('/users', [AdminUserController::class, 'index'])
            ->middleware('permission:users.view');
        Route::patch('/users/{user}/toggle-suspension', [AdminUserController::class, 'toggleSuspension'])
            ->middleware('permission:users.manage');

        Route::get('/billboards', [AdminBillboardController::class, 'index'])
            ->middleware('permission:billboards.view');

        Route::get('/bookings', [AdminBookingController::class, 'index'])
            ->middleware('permission:bookings.view');
        Route::patch('/bookings/{booking}/cancel', [AdminBookingController::class, 'cancel'])
            ->middleware('permission:bookings.manage');

        // ---- Access control (RBAC) — reads need admins.manage, writes need Super Admin ----
        Route::get('/permissions', [AccessControlController::class, 'permissions'])
            ->middleware('permission:admins.manage');
        Route::get('/admins', [AccessControlController::class, 'index'])
            ->middleware('permission:admins.manage');
        Route::post('/admins', [AccessControlController::class, 'store'])
            ->middleware('permission:admins.manage');
        Route::patch('/admins/{admin}/permissions', [AccessControlController::class, 'updatePermissions'])
            ->middleware('permission:admins.manage');
        Route::patch('/admins/{admin}/super-admin', [AccessControlController::class, 'updateSuperAdmin'])
            ->middleware('permission:admins.manage');

        // ---- Immutable audit trail (read-only by construction) ----
        Route::get('/audit-logs', [AuditLogController::class, 'index'])
            ->middleware('permission:audit.view');

        // ---- Security posture, lockouts and device/session management ----
        Route::get('/security', [SecurityController::class, 'overview'])
            ->middleware('permission:audit.view');
        Route::patch('/users/{user}/unlock', [SecurityController::class, 'unlockUser'])
            ->middleware('permission:users.manage');
        // Own sessions only — no permission needed beyond being an admin.
        Route::get('/sessions', [SecurityController::class, 'sessions']);
        Route::delete('/sessions/others', [SecurityController::class, 'revokeOtherSessions']);
    });
});
