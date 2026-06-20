<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\Request;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'description',
        'ip_address',
        'user_agent',
        'device_type',
        'browser',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public static function record(Request $request, string $action, string $description, array $metadata = []): void
    {
        $ua = (string) $request->userAgent();
        self::create([
            'user_id'     => optional($request->user())->id,
            'action'      => $action,
            'description' => $description,
            'ip_address'  => $request->ip(),
            'user_agent'  => substr($ua, 0, 500),
            'device_type' => self::detectDevice($ua),
            'browser'     => self::detectBrowser($ua),
            'metadata'    => $metadata ?: null,
        ]);
    }

    public static function detectDeviceStatic(string $ua): string
    {
        return self::detectDevice($ua);
    }

    public static function detectBrowserStatic(string $ua): string
    {
        return self::detectBrowser($ua);
    }

    private static function detectDevice(string $ua): string
    {
        $ua = strtolower($ua);
        if (str_contains($ua, 'tablet') || str_contains($ua, 'ipad')) {
            return 'Tablet';
        }
        if (str_contains($ua, 'mobile') || str_contains($ua, 'android') || str_contains($ua, 'iphone')) {
            return 'Mobile';
        }
        return 'Desktop';
    }

    private static function detectBrowser(string $ua): string
    {
        $ua = strtolower($ua);
        if (str_contains($ua, 'edg/') || str_contains($ua, 'edge/')) return 'Edge';
        if (str_contains($ua, 'opr/') || str_contains($ua, 'opera/')) return 'Opera';
        if (str_contains($ua, 'chrome/') || str_contains($ua, 'chromium/')) return 'Chrome';
        if (str_contains($ua, 'firefox/')) return 'Firefox';
        if (str_contains($ua, 'safari/')) return 'Safari';
        return 'Unknown';
    }
}
