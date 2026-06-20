<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->string('notification_type', 30)->default('report_submitted')->after('id');
            $table->json('metadata')->nullable()->after('read_at');
        });
    }

    public function down(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->dropColumn(['notification_type', 'metadata']);
        });
    }
};
