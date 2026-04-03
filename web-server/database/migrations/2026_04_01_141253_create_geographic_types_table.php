<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('geographic_types', function (Blueprint $table) {
            $table->tinyIncrements('id');
            $table->string('name', 100)->unique();
        });

        DB::table('geographic_types')->insertOrIgnore([
            ['id' => 1, 'name' => 'Real Road'],
            ['id' => 2, 'name' => 'Poblacion'],
            ['id' => 3, 'name' => 'Mountain Area'],
            ['id' => 4, 'name' => 'River Side'],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('geographic_types');
    }
};
