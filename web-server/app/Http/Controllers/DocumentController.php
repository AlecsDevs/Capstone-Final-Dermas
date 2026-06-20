<?php

namespace App\Http\Controllers;

use App\Models\Document;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    // Active documents (not trashed)
    public function index(): JsonResponse
    {
        $documents = Document::query()
            ->with('uploader:id,full_name,username,role')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($documents);
    }

    // Trashed documents (deleted within last 30 days)
    public function trash(): JsonResponse
    {
        $documents = Document::onlyTrashed()
            ->with('uploader:id,full_name,username,role')
            ->orderByDesc('deleted_at')
            ->get()
            ->map(function (Document $doc) {
                $deletedAt = $doc->deleted_at;
                $daysLeft = $deletedAt
                    ? max(0, 30 - (int) now()->diffInDays($deletedAt))
                    : 30;
                $doc->days_until_permanent_delete = $daysLeft;
                return $doc;
            });

        return response()->json($documents);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title'       => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:500'],
            'file'        => ['required', 'file', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx', 'max:20480'],
        ]);

        $file = $validated['file'];
        $storedPath = $file->store('documents', 'public');

        $document = Document::create([
            'title'         => $validated['title'] ?? null,
            'description'   => $validated['description'] ?? null,
            'original_name' => $file->getClientOriginalName(),
            'file_path'     => '/storage/' . $storedPath,
            'mime_type'     => $file->getMimeType() ?? 'application/octet-stream',
            'file_size'     => $file->getSize() ?? 0,
            'uploaded_by'   => $request->user()->id,
        ]);

        return response()->json([
            'message'  => 'Document uploaded successfully.',
            'document' => $document->load('uploader:id,full_name,username,role'),
        ], 201);
    }

    // Soft-delete → moves to Trash
    public function destroy(Request $request, Document $document): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $isOwner = (int) $document->uploaded_by === (int) $user->id;

        if (!$isAdmin && !$isOwner) {
            return response()->json(['message' => 'You are not authorized to delete this document.'], 403);
        }

        $document->delete(); // soft delete — sets deleted_at

        return response()->json(['message' => 'Document moved to Trash. It will be permanently deleted after 30 days.']);
    }

    // Restore from Trash
    public function restore(Request $request, int $id): JsonResponse
    {
        $document = Document::onlyTrashed()->findOrFail($id);

        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $isOwner = (int) $document->uploaded_by === (int) $user->id;

        if (!$isAdmin && !$isOwner) {
            return response()->json(['message' => 'You are not authorized to restore this document.'], 403);
        }

        $document->restore();

        return response()->json(['message' => 'Document restored successfully.']);
    }

    // Permanently delete from Trash
    public function forceDelete(Request $request, int $id): JsonResponse
    {
        $document = Document::onlyTrashed()->findOrFail($id);

        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['message' => 'Only admins can permanently delete documents.'], 403);
        }

        $path = (string) $document->file_path;
        if (str_starts_with($path, '/storage/')) {
            Storage::disk('public')->delete(substr($path, strlen('/storage/')));
        }

        $document->forceDelete();

        return response()->json(['message' => 'Document permanently deleted.']);
    }
}
