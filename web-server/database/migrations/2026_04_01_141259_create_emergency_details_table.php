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
        Schema::create('emergency_details', function (Blueprint $table) {
            $table->unsignedInteger('report_id')->primary();
            $table->string('mechanism_of_injury', 150)->nullable();
            $table->string('nature_of_illness', 150)->nullable();
            $table->string('type_of_emergency', 100)->nullable();
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
        Schema::dropIfExists('emergency_details');
    }
};
