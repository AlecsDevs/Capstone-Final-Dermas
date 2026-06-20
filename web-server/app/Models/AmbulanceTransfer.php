<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AmbulanceTransfer extends Model
{
    protected $table = 'ambulance_transfers';

    protected $fillable = [
        'report_id',
        'ambulance_driver',
        'dispatcher',
        'responders',
        'receiving_facility',
        'receiving_personnel',
    ];

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'report_id');
    }
}
