<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_details', function (Blueprint $table) {
            $table->string('dispatcher_name', 100)->nullable()->default(null)->change();
        });
    }

    public function down(): void
    {
        Schema::table('incident_details', function (Blueprint $table) {
            $table->string('dispatcher_name', 100)->nullable(false)->change();
        });
    }
};
