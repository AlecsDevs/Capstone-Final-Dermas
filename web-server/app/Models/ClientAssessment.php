<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientAssessment extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'client_assessments';

    protected $fillable = [
        'client_id',
        'chief_complaint',
        'loc',
        'airway',
        'breathing',
        'circulation',
        'capillary_refill',
        'pupils',
        'ob_lmp',
        'ob_aog',
        'ob_edd',
        'ob_gravida',
        'ob_para',
        'ob_term',
        'ob_preterm',
        'ob_abortion',
        'ob_living',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class, 'client_assessment_id');
    }

    public function glasgowScores(): HasMany
    {
        return $this->hasMany(GlasgowScore::class, 'client_assessment_id');
    }
}
