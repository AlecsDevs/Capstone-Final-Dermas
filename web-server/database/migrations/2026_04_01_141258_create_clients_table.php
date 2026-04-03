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
        Schema::create('clients', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('report_id');
            $table->string('full_name', 150);
            $table->unsignedTinyInteger('age')->nullable();
            $table->enum('gender', ['Male', 'Female']);
            $table->string('nationality', 100)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->text('permanent_address')->nullable();
            $table->text('incident_address')->nullable();
            $table->timestamps();

            $table->foreign('report_id')
                ->references('id')
                ->on('reports')
                ->onDelete('cascade');

            $table->index('report_id', 'idx_clients_report');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
