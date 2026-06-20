<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('emergency_details', function (Blueprint $table) {
            $table->string('nature_of_call', 100)->nullable()->after('type_of_emergency');
        });
    }

    public function down(): void
    {
        Schema::table('emergency_details', function (Blueprint $table) {
            $table->dropColumn('nature_of_call');
        });
    }
};
