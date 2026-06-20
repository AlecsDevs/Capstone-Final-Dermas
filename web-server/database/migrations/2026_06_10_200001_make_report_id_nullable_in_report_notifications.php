<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // FKs were already dropped by a prior partial migration attempt — just change nullability
        \Illuminate\Support\Facades\DB::statement(
            'ALTER TABLE report_notifications MODIFY report_id BIGINT UNSIGNED NULL'
        );
        \Illuminate\Support\Facades\DB::statement(
            'ALTER TABLE report_notifications MODIFY actor_user_id BIGINT UNSIGNED NULL'
        );
    }

    public function down(): void
    {
        Schema::table('report_notifications', function (Blueprint $table) {
            $table->unsignedBigInteger('report_id')->nullable(false)->change();
            $table->unsignedBigInteger('actor_user_id')->nullable(false)->change();
        });
    }
};
