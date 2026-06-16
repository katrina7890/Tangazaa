<?php

use App\Http\Controllers\Api\Admin\BillboardController as AdminBillboardController;
use App\Http\Controllers\Api\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillboardController;
use App\Http\Controllers\Api\BookingController;
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

    Route::middleware('role:owner,admin')->group(function () {
        Route::get('/my/billboards', [BillboardController::class, 'mine']);
        Route::post('/billboards', [BillboardController::class, 'store']);
        Route::put('/billboards/{billboard}', [BillboardController::class, 'update']);
        Route::delete('/billboards/{billboard}', [BillboardController::class, 'destroy']);
        Route::get('/billboards/{billboard}/bookings', [BillboardController::class, 'bookings']);
    });

    Route::middleware('role:customer')->group(function () {
        Route::post('/bookings', [BookingController::class, 'store']);
        Route::get('/my/bookings', [BookingController::class, 'mine']);
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
