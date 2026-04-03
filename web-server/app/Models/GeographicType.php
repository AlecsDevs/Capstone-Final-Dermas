<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GeographicType extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'geographic_types';

    protected $fillable = [
        'name',
    ];

    public function reports(): HasMany
    {
        return $this->hasMany(Report::class, 'geographic_type_id');
    }
}
