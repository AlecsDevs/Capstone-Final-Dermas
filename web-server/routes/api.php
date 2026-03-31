<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/login', [AuthController::class, 'login']);

// Requires valid Sanctum token
Route::middleware(['auth:sanctum', 'device.bound'])->group(function () {
    Route::post('/logout',       [AuthController::class, 'logout']);
    Route::get('/me',            [AuthController::class, 'me']);
    Route::get('/session-check', [AuthController::class, 'sessionCheck']);

    // Admin only
    Route::get('/users',         [AuthController::class, 'index']);
    Route::post('/users',        [AuthController::class, 'store']);
    Route::patch('/users/{id}',  [AuthController::class, 'updateUser']);
    Route::post('/users/{id}/change-password', [AuthController::class, 'changePassword']);
    Route::patch('/users/{id}/status', [AuthController::class, 'updateStatus']);
    Route::post('/users/{id}/logout-all-devices', [AuthController::class, 'logoutAllDevices']);
    Route::delete('/users/{id}', [AuthController::class, 'destroy']);
});
