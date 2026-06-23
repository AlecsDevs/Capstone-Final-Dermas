<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicFileController extends Controller
{
    public function show(Request $request, string $path): StreamedResponse
    {
        $normalizedPath = ltrim($path, '/');

        if ($normalizedPath === '' || str_contains($normalizedPath, '..')) {
            abort(404);
        }

        $disk = Storage::disk('public');

        if (!$disk->exists($normalizedPath)) {
            abort(404);
        }

        $response = $disk->response($normalizedPath);

        // Allow cross-origin image loads (needed for html2canvas PDF export).
        $allowedOrigins = array_filter(config('cors.allowed_origins', []));
        $origin = $request->headers->get('Origin', '');
        if ($origin && in_array($origin, $allowedOrigins, true)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
            $response->headers->set('Vary', 'Origin');
        }

        return $response;
    }
}
