<?php

namespace App\Console\Commands;

use App\Models\Document;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class PurgeOldTrashedDocuments extends Command
{
    protected $signature = 'documents:purge-trash';
    protected $description = 'Permanently delete documents that have been in trash for more than 30 days';

    public function handle(): int
    {
        $expired = Document::onlyTrashed()
            ->where('deleted_at', '<=', now()->subDays(30))
            ->get();

        $count = 0;
        foreach ($expired as $document) {
            $path = (string) $document->file_path;
            if (str_starts_with($path, '/storage/')) {
                Storage::disk('public')->delete(substr($path, strlen('/storage/')));
            }
            $document->forceDelete();
            $count++;
        }

        $this->info("Purged {$count} expired document(s) from trash.");
        return self::SUCCESS;
    }
}
