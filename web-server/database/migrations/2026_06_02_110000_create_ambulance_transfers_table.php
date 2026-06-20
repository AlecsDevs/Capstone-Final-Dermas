<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ambulance_transfers', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('report_id')->unique();
            $table->string('ambulance_driver', 255)->nullable();
            $table->text('responders')->nullable();
            $table->string('receiving_facility', 255)->nullable();
            $table->string('receiving_personnel', 255)->nullable();
            $table->timestamps();

            $table->foreign('report_id')
                ->references('id')
                ->on('reports')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ambulance_transfers');
    }
};
