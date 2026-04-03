<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Client extends Model
{
    use HasFactory;

    protected $table = 'clients';

    protected $fillable = [
        'report_id',
        'full_name',
        'age',
        'gender',
        'nationality',
        'contact_number',
        'permanent_address',
        'incident_address',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'report_id');
    }

    public function assessment(): HasOne
    {
        return $this->hasOne(ClientAssessment::class, 'client_id');
    }
}
