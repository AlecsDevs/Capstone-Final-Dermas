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
        Schema::create('reports', function (Blueprint $table) {
            $table->increments('id');
            $table->enum('report_type', ['Emergency', 'Incident']);
            $table->unsignedTinyInteger('geographic_type_id');
            $table->date('date_reported');
            $table->time('time_reported');
            $table->enum('status', ['Draft', 'Submitted', 'Approved', 'Rejected'])->default('Draft');
            $table->timestamps();

            $table->foreign('geographic_type_id')
                ->references('id')
                ->on('geographic_types');

            $table->index('report_type', 'idx_reports_type');
            $table->index('geographic_type_id', 'idx_reports_geo');
            $table->index('date_reported', 'idx_reports_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
