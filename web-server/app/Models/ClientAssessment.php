<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAssessment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'client_assessments';

    protected $fillable = [
        'client_id',
        'chief_complaint',
        'airway',
        'breathing',
        'circulation_support',
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
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }
}
