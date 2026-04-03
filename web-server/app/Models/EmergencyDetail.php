<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmergencyDetail extends Model
{
    use HasFactory;

    public $timestamps = false;
    protected $primaryKey = 'report_id';
    public $incrementing = false;
    protected $keyType = 'int';

    protected $table = 'emergency_details';

    protected $fillable = [
        'report_id',
        'mechanism_of_injury',
        'nature_of_illness',
        'type_of_emergency',
        'incident_date',
        'incident_time',
        'dispatcher_name',
    ];

    protected function casts(): array
    {
        return [
            'incident_date' => 'date',
        ];
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'report_id');
    }
}
