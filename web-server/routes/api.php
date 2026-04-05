<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PublicFileController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/login', [AuthController::class, 'login']);
Route::get('/files/public/{path}', [PublicFileController::class, 'show'])->where('path', '.*');

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

    Route::get('/geographic-types', [ReportController::class, 'geographicTypes']);

    Route::prefix('/reports')->group(function () {
        Route::get('/', [ReportController::class, 'index']);
        Route::get('/summary', [ReportController::class, 'summary']);
        Route::get('/my-data', [ReportController::class, 'myData']);
        Route::post('/', [ReportController::class, 'storeDraft']);
        Route::get('/{report}', [ReportController::class, 'show']);
        Route::put('/{report}', [ReportController::class, 'updateDraft']);
        Route::delete('/{report}', [ReportController::class, 'destroy']);

        Route::put('/{report}/clients', [ReportController::class, 'upsertClients']);
        Route::put('/{report}/emergency-details', [ReportController::class, 'upsertEmergencyDetails']);
        Route::put('/{report}/incident-details', [ReportController::class, 'upsertIncidentDetails']);
        Route::put('/{report}/assessment', [ReportController::class, 'upsertAssessment']);
        Route::put('/{report}/responders', [ReportController::class, 'upsertResponders']);
        Route::put('/{report}/photos', [ReportController::class, 'upsertPhotos']);
        Route::post('/{report}/photos/upload', [ReportController::class, 'uploadPhoto']);
        Route::post('/{report}/submit', [ReportController::class, 'submit']);
    });

    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markRead']);
});
