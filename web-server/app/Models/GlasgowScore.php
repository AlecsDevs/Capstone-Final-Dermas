<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GlasgowScore extends Model
{
    protected $table = 'glasgow_scores';

    protected $fillable = [
        'client_assessment_id',
        'eye',
        'verbal',
        'motor',
    ];

    public function clientAssessment(): BelongsTo
    {
        return $this->belongsTo(ClientAssessment::class, 'client_assessment_id');
    }
}
