<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VitalSign extends Model
{
    protected $table = 'vital_signs';

    protected $fillable = [
        'client_assessment_id',
        'bp',
        'rr',
        'pr',
        'temp',
        'spo2',
    ];

    public function clientAssessment(): BelongsTo
    {
        return $this->belongsTo(ClientAssessment::class, 'client_assessment_id');
    }
}
