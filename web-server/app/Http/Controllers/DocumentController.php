<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    public function index(): JsonResponse
    {
        $documents = Document::query()
            ->with('uploader:id,username,role')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($documents);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['nullable', 'string', 'max:150'],
            'file' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ]);

        $file = $validated['file'];
        $storedPath = $file->store('documents', 'public');

        $document = Document::create([
            'title' => $validated['title'] ?? null,
            'original_name' => $file->getClientOriginalName(),
            'file_path' => '/storage/' . $storedPath,
            'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
            'file_size' => $file->getSize() ?? 0,
            'uploaded_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Document uploaded successfully.',
            'document' => $document->load('uploader:id,username,role'),
        ], 201);
    }

    public function destroy(Request $request, Document $document): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $isOwner = (int) $document->uploaded_by === (int) $user->id;

        if (!$isAdmin && !$isOwner) {
            return response()->json([
                'message' => 'You are not authorized to delete this document.',
            ], 403);
        }

        $path = (string) $document->file_path;
        if (str_starts_with($path, '/storage/')) {
            $publicRelativePath = substr($path, strlen('/storage/'));
            Storage::disk('public')->delete($publicRelativePath);
        }

        $document->delete();

        return response()->json([
            'message' => 'Document deleted successfully.',
        ]);
    }
}
