<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->date('ob_lmp')->nullable()->after('transferred_to_hospital');
            $table->string('ob_aog', 50)->nullable()->after('ob_lmp');
            $table->date('ob_edd')->nullable()->after('ob_aog');
            $table->unsignedSmallInteger('ob_gravida')->nullable()->after('ob_edd');
            $table->unsignedSmallInteger('ob_para')->nullable()->after('ob_gravida');
            $table->unsignedSmallInteger('ob_term')->nullable()->after('ob_para');
            $table->unsignedSmallInteger('ob_preterm')->nullable()->after('ob_term');
            $table->unsignedSmallInteger('ob_abortion')->nullable()->after('ob_preterm');
            $table->unsignedSmallInteger('ob_living')->nullable()->after('ob_abortion');
        });
    }

    public function down(): void
    {
        Schema::table('client_assessments', function (Blueprint $table) {
            $table->dropColumn([
                'ob_lmp', 'ob_aog', 'ob_edd',
                'ob_gravida', 'ob_para', 'ob_term',
                'ob_preterm', 'ob_abortion', 'ob_living',
            ]);
        });
    }
};
