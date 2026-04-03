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
        Schema::create('client_assessments', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('client_id')->unique();
            $table->text('chief_complaint')->nullable();
            $table->string('airway', 255)->nullable();
            $table->string('breathing', 255)->nullable();
            $table->string('circulation_support', 255)->nullable();
            $table->string('wound_care', 255)->nullable();
            $table->string('miscellaneous', 255)->nullable();
            $table->enum('history_of_coronary_disease', ['Yes', 'No', 'Undetermined'])->nullable();
            $table->enum('collapse_witness', ['Yes', 'No'])->nullable();
            $table->time('time_of_collapse')->nullable();
            $table->time('start_of_cpr')->nullable();
            $table->time('defibrillation_time')->nullable();
            $table->unsignedSmallInteger('cpr_duration')->nullable();
            $table->string('rosc', 255)->nullable();
            $table->string('transferred_to_hospital', 255)->nullable();

            $table->foreign('client_id')
                ->references('id')
                ->on('clients')
                ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_assessments');
    }
};
