<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('client_assessment_id');
            $table->foreign('client_assessment_id')
                ->references('id')
                ->on('client_assessments')
                ->onDelete('cascade');
            $table->string('bp', 50)->nullable();
            $table->string('rr', 50)->nullable();
            $table->string('pr', 50)->nullable();
            $table->string('temp', 50)->nullable();
            $table->string('spo2', 50)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vital_signs');
    }
};
