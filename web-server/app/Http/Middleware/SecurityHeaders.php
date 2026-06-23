<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Prevent MIME type sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        // Anti-clickjacking
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');

        // Disable legacy XSS filter (modern browsers ignore it; setting 0 is best practice)
        $response->headers->set('X-XSS-Protection', '0');

        // Control referrer information
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        // Restrict browser feature access
        $response->headers->set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

        // Prevent caching of sensitive API responses (but allow public file caching)
        $contentType = $response->headers->get('Content-Type', '');
        $isFile = str_contains($contentType, 'image/') || str_contains($contentType, 'application/pdf');
        if (!$isFile) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
        }

        // HSTS — only sent over HTTPS to avoid breaking HTTP dev
        if ($request->secure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        }

        // Content Security Policy
        $response->headers->set('Content-Security-Policy',
            "default-src 'self'; " .
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " .
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " .
            "font-src 'self' https://fonts.gstatic.com data:; " .
            "img-src 'self' data: blob: https:; " .
            "connect-src 'self' https://api.open-meteo.com https://earthquake.usgs.gov https://nominatim.openstreetmap.org; " .
            "frame-ancestors 'none';"
        );

        // Strip server identification headers
        $response->headers->remove('X-Powered-By');
        $response->headers->set('X-Powered-By', '');

        return $response;
    }
}
