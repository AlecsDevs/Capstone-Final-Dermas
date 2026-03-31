<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenMatchesDevice
{
    public function handle(Request $request, Closure $next): Response
    {
        if (($request->user()?->status ?? 'active') === 'inactive') {
            $request->user()?->currentAccessToken()?->delete();
            return response()->json([
                'message' => 'Your account is deactivated. Please contact admin.'
            ], 403);
        }

        $token = $request->user()?->currentAccessToken();

        if (!$token) {
            return $next($request);
        }

        // Backward compatibility: allow legacy tokens that have no device metadata yet.
        if (empty($token->device_name) || empty($token->ip_address)) {
            return $next($request);
        }

        $currentDeviceName = $this->resolveDeviceName($request);
        $currentIpAddress = $this->resolveIpAddress($request);

        if (
            !hash_equals((string) $token->device_name, $currentDeviceName)
            || !hash_equals((string) $token->ip_address, $currentIpAddress)
        ) {
            return response()->json([
                'message' => 'This token is bound to another device. Please login again on this device.'
            ], 401);
        }

        return $next($request);
    }

    private function resolveDeviceName(Request $request): string
    {
        return trim((string) $request->header('X-Device-Name', 'Web Browser'));
    }

    private function resolveIpAddress(Request $request): string
    {
        return (string) $request->ip();
    }
}
