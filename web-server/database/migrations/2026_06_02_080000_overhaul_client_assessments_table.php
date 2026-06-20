<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Step 1: rename circulation_support -> circulation
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->renameColumn('circulation_support', 'circulation');
        });

        // Step 2: drop obsolete columns
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->dropColumn([
                'chief_complaint',
                'wound_care',
                'miscellaneous',
                'history_of_coronary_disease',
                'collapse_witness',
                'time_of_collapse',
                'start_of_cpr',
                'defibrillation_time',
                'cpr_duration',
                'rosc',
                'transferred_to_hospital',
            ]);
        });

        // Step 3: add new columns
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->string('loc', 100)->nullable()->after('client_id');
            $table->string('capillary_refill', 50)->nullable()->after('circulation');
            $table->string('pupils', 100)->nullable()->after('capillary_refill');
        });
    }

    public function down(): void
    {
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->dropColumn(['loc', 'capillary_refill', 'pupils']);
        });

        Schema::table('client_assessments', function (Blueprint $table) {
            $table->text('chief_complaint')->nullable();
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
        });

        Schema::table('client_assessments', function (Blueprint $table) {
            $table->renameColumn('circulation', 'circulation_support');
        });
    }
};
