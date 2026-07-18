<?php

use App\Http\Controllers\Api\Admin\BillboardController as AdminBillboardController;
use App\Http\Controllers\Api\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillboardController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\Partner\ArtworkController;
use App\Http\Controllers\Api\Partner\BookingUpdateController;
use App\Http\Controllers\Api\Partner\ContactController;
use App\Http\Controllers\Api\Partner\OfflineBookingController;
use App\Http\Controllers\Api\Partner\OverviewController;
use App\Http\Controllers\Api\Partner\TeamController;
use App\Http\Controllers\Api\Partner\WorkOrderController;
use App\Http\Controllers\Api\PaymentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::get('/billboards', [BillboardController::class, 'index']);
Route::get('/billboards/{billboard}', [BillboardController::class, 'show']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // In-app notifications (any signed-in role; currently produced for owners).
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    Route::middleware('role:owner,admin')->group(function () {
        Route::post('/billboards', [BillboardController::class, 'store']);
        Route::put('/billboards/{billboard}', [BillboardController::class, 'update']);
        Route::delete('/billboards/{billboard}', [BillboardController::class, 'destroy']);
        Route::get('/billboards/{billboard}/bookings', [BillboardController::class, 'bookings']);

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

            Route::get('/contacts', [ContactController::class, 'index']);
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
            Route::post('/offline-bookings', [OfflineBookingController::class, 'store']);

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

        // Simulated Paystack checkout.
        Route::post('/bookings/{booking}/pay', [PaymentController::class, 'initialize']);
        Route::post('/payments/{reference}/verify', [PaymentController::class, 'verify']);
    });

    Route::middleware('role:admin')->prefix('admin')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/login-attempts', [DashboardController::class, 'loginAttempts']);

        Route::get('/users', [AdminUserController::class, 'index']);
        Route::patch('/users/{user}/toggle-suspension', [AdminUserController::class, 'toggleSuspension']);

        Route::get('/billboards', [AdminBillboardController::class, 'index']);

        Route::get('/bookings', [AdminBookingController::class, 'index']);
        Route::patch('/bookings/{booking}/cancel', [AdminBookingController::class, 'cancel']);
    });
});
