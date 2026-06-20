<?php

namespace App\Console\Commands;

use App\Models\EmergencyDetail;
use App\Models\Report;
use App\Models\ReportNotification;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class SendDailyEmergencyReport extends Command
{
    protected $signature = 'report:daily-emergency {--date= : Date to report on (Y-m-d, defaults to today)}';
    protected $description = 'Send daily emergency report summary notification to all staff and admins';

    public function handle(): int
    {
        $dateStr = $this->option('date') ?? now()->toDateString();
        $date = Carbon::parse($dateStr);

        // Get all Emergency reports submitted or created today
        $reports = Report::query()
            ->where('report_type', 'Emergency')
            ->whereDate('date_reported', $date->toDateString())
            ->with(['emergencyDetails', 'clients'])
            ->get();

        $total = $reports->count();

        // Build breakdowns
        $byNature = [];
        foreach ($reports as $report) {
            $detail = $report->emergencyDetails ?? $report->emergency_details ?? null;
            $nature = trim((string) ($detail?->nature_of_call ?? ''));
            if ($nature === '') $nature = 'Unspecified';
            $byNature[$nature] = ($byNature[$nature] ?? 0) + 1;
        }

        arsort($byNature);

        $metadata = [
            'date'      => $date->toDateString(),
            'total'     => $total,
            'by_nature' => $byNature,
        ];

        $now = now();
        $recipientIds = User::query()
            ->whereIn('role', ['admin', 'staff'])
            ->where('status', 'active')
            ->pluck('id');

        if ($recipientIds->isEmpty()) {
            $this->warn('No active users found.');
            return self::SUCCESS;
        }

        $payloads = [];
        foreach ($recipientIds as $recipientId) {
            $payloads[] = [
                'notification_type' => 'daily_report',
                'user_id'           => (int) $recipientId,
                'report_id'         => null,
                'actor_user_id'     => null,
                'actor_username'    => 'System',
                'report_type'       => 'Emergency',
                'client_name'       => null,
                'submitted_at'      => $now,
                'is_read'           => false,
                'read_at'           => null,
                'metadata'          => json_encode($metadata),
                'created_at'        => $now,
                'updated_at'        => $now,
            ];
        }

        ReportNotification::query()->insert($payloads);

        $this->info("Daily emergency report sent for {$dateStr}: {$total} report(s), " . count($recipientIds) . " recipient(s).");
        return self::SUCCESS;
    }
}
