<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Drop FK constraints first (ignore if already gone)
        try {
            Schema::table('report_notifications', function (Blueprint $table) {
                $table->dropForeign(['report_id']);
            });
        } catch (\Throwable $e) {}

        try {
            Schema::table('report_notifications', function (Blueprint $table) {
                $table->dropForeign(['actor_user_id']);
            });
        } catch (\Throwable $e) {}

        // Make columns nullable (no FK re-add — avoids column type mismatch on older MySQL)
        DB::statement('ALTER TABLE report_notifications MODIFY report_id BIGINT UNSIGNED NULL');
        DB::statement('ALTER TABLE report_notifications MODIFY actor_user_id BIGINT UNSIGNED NULL');
    }

    public function down(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('report_id')->nullable(false)->change();
            $table->unsignedBigInteger('actor_user_id')->nullable(false)->change();
        });
    }
};
