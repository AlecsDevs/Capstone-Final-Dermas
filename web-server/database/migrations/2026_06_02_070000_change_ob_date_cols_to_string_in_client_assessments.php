<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->string('ob_lmp', 50)->nullable()->change();
            $table->string('ob_edd', 50)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->date('ob_lmp')->nullable()->change();
            $table->date('ob_edd')->nullable()->change();
        });
    }
};
