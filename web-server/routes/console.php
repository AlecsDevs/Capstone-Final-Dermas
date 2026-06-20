<?php

use App\Console\Commands\PurgeOldTrashedDocuments;
use App\Console\Commands\SendDailyEmergencyReport;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Daily emergency report at 8:00 PM
Schedule::command(SendDailyEmergencyReport::class)->dailyAt('20:00');

// Purge documents trashed for more than 30 days — runs daily at midnight
Schedule::command(PurgeOldTrashedDocuments::class)->dailyAt('00:00');
