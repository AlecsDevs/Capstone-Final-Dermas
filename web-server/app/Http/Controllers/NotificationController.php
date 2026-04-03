<?php

namespace App\Http\Controllers;

use App\Models\ReportNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
            'unread_only' => ['nullable', 'boolean'],
        ]);

        $limit = (int) ($validated['limit'] ?? 20);
        $unreadOnly = (bool) ($validated['unread_only'] ?? false);

        $query = ReportNotification::query()
            ->where('user_id', (int) $request->user()->id)
            ->orderByDesc('created_at');

        if ($unreadOnly) {
            $query->where('is_read', false);
        }

        $items = $query
            ->limit($limit)
            ->get([
                'id',
                'report_id',
                'actor_username',
                'report_type',
                'client_name',
                'submitted_at',
                'is_read',
                'read_at',
            ]);

        $unreadCount = ReportNotification::query()
            ->where('user_id', (int) $request->user()->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'items' => $items,
            'unread_count' => $unreadCount,
        ]);
    }

    public function markRead(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['nullable', 'array'],
            'ids.*' => ['required', 'integer'],
        ]);

        $userId = (int) $request->user()->id;
        $baseQuery = ReportNotification::query()
            ->where('user_id', $userId)
            ->where('is_read', false);

        if (!empty($validated['ids'])) {
            $baseQuery->whereIn('id', $validated['ids']);
        }

        $updated = $baseQuery->update([
            'is_read' => true,
            'read_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Notifications marked as read.',
            'updated' => $updated,
        ]);
    }
}
