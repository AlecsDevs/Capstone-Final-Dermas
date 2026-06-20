<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PublicFileController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

// Public
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
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
        Route::get('/trash', [ReportController::class, 'trash']);
        Route::post('/', [ReportController::class, 'storeDraft']);
        Route::post('/{id}/restore', [ReportController::class, 'restore']);
        Route::delete('/{id}/force', [ReportController::class, 'forceDelete']);
        Route::get('/{report}', [ReportController::class, 'show']);
        Route::put('/{report}', [ReportController::class, 'updateDraft']);
        Route::delete('/{report}', [ReportController::class, 'destroy']);

        Route::put('/{report}/clients', [ReportController::class, 'upsertClients']);
        Route::put('/{report}/emergency-details', [ReportController::class, 'upsertEmergencyDetails']);
        Route::put('/{report}/incident-details', [ReportController::class, 'upsertIncidentDetails']);
        Route::put('/{report}/assessment', [ReportController::class, 'upsertAssessment']);
        Route::put('/{report}/ambulance-transfer', [ReportController::class, 'upsertAmbulanceTransfer']);
        Route::put('/{report}/responders', [ReportController::class, 'upsertResponders']);
        Route::put('/{report}/photos', [ReportController::class, 'upsertPhotos']);
        Route::post('/{report}/photos/upload', [ReportController::class, 'uploadPhoto']);
        Route::post('/{report}/submit', [ReportController::class, 'submit']);
    });

    Route::get('/documents', [DocumentController::class, 'index']);
    Route::get('/documents/trash', [DocumentController::class, 'trash']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);
    Route::post('/documents/{id}/restore', [DocumentController::class, 'restore']);
    Route::delete('/documents/{id}/force', [DocumentController::class, 'forceDelete']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markRead']);

    Route::get('/activity-logs', [ActivityLogController::class, 'index']);

    Route::post('/daily-report/trigger', function () {
        \Illuminate\Support\Facades\Artisan::call(
            \App\Console\Commands\SendDailyEmergencyReport::class,
            []
        );
        return response()->json(['message' => 'Daily emergency report notification sent.']);
    });

    // Droplet disk storage info (admin only — reads server disk via PHP built-ins)
    Route::get('/system/storage', function () {
        $total = disk_total_space('/');
        $free  = disk_free_space('/');
        $used  = $total - $free;
        return response()->json([
            'total_gb'     => round($total / 1073741824, 1),
            'used_gb'      => round($used  / 1073741824, 1),
            'free_gb'      => round($free  / 1073741824, 1),
            'percent_used' => $total > 0 ? (int) round(($used / $total) * 100) : 0,
        ]);
    });
});
