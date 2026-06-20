<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('incident_details', function (Blueprint $table) {
            $table->enum('severity_level', ['Low', 'Moderate', 'High', 'Critical'])
                  ->nullable()
                  ->after('type_of_hazard');
            $table->string('incident_barangay', 255)
                  ->nullable()
                  ->after('severity_level');
            // Make nature_of_call optional — no longer required for new incident reports
            $table->string('nature_of_call', 100)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('incident_details', function (Blueprint $table) {
            $table->dropColumn(['severity_level', 'incident_barangay']);
        });
    }
};
