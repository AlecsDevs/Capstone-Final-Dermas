<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Report extends Model
{
    use HasFactory;

    protected $table = 'reports';

    protected $fillable = [
        'report_type',
        'geographic_type_id',
        'date_reported',
        'time_reported',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_reported' => 'date',
        ];
    }

    public function geographicType(): BelongsTo
    {
        return $this->belongsTo(GeographicType::class, 'geographic_type_id');
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class, 'report_id');
    }

    public function emergencyDetails(): HasOne
    {
        return $this->hasOne(EmergencyDetail::class, 'report_id');
    }

    public function incidentDetails(): HasOne
    {
        return $this->hasOne(IncidentDetail::class, 'report_id');
    }

    public function responders(): HasMany
    {
        return $this->hasMany(Responder::class, 'report_id');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ReportPhoto::class, 'report_id');
    }
}
