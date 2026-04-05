<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PublicFileController extends Controller
{
    public function show(string $path): StreamedResponse
    {
        $normalizedPath = ltrim($path, '/');

        // Block path traversal attempts.
        if ($normalizedPath === '' || str_contains($normalizedPath, '..')) {
            abort(404);
        }

        $disk = Storage::disk('public');

        if (!$disk->exists($normalizedPath)) {
            abort(404);
        }

        return $disk->response($normalizedPath);
    }
}
