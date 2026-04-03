<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReportNotification extends Model
{
    use HasFactory;

    protected $table = 'report_notifications';

    protected $fillable = [
        'user_id',
        'report_id',
        'actor_user_id',
        'actor_username',
        'report_type',
        'client_name',
        'submitted_at',
        'is_read',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
            'is_read' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function report(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'report_id');
    }

    public function actorUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }
}
