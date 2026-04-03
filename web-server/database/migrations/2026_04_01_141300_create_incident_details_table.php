<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('incident_details', function (Blueprint $table) {
            $table->unsignedInteger('report_id')->primary();
            $table->enum('type_of_hazard', ['Flood', 'Earthquake', 'Typhoon', 'Landslide']);
            $table->enum('nature_of_call', ['Emergency', 'Coordination', 'Search and Rescue']);
            $table->date('incident_date');
            $table->time('incident_time');
            $table->string('dispatcher_name', 100);

            $table->foreign('report_id')
                ->references('id')
                ->on('reports')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incident_details');
    }
};
