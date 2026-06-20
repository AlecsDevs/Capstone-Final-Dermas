<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('glasgow_scores', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('client_assessment_id');
            $table->foreign('client_assessment_id')
                ->references('id')
                ->on('client_assessments')
                ->onDelete('cascade');
            $table->tinyInteger('eye')->nullable()->comment('1-4');
            $table->tinyInteger('verbal')->nullable()->comment('1-5');
            $table->tinyInteger('motor')->nullable()->comment('1-6');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('glasgow_scores');
    }
};
