<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_details', function (Blueprint $table) {
            $table->string('type_of_incident', 100)->nullable()->after('report_id');
        });
    }

    public function down(): void
    {
        Schema::table('incident_details', function (Blueprint $table) {
            $table->dropColumn('type_of_incident');
        });
    }
};
