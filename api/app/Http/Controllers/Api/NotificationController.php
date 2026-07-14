<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AppNotificationResource;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()->appNotifications()
            ->latest()
            ->limit(30)
            ->get();

        return AppNotificationResource::collection($notifications)
            ->additional([
                'unread_count' => $request->user()->appNotifications()->whereNull('read_at')->count(),
            ])
            ->response();
    }

    public function markRead(Request $request, AppNotification $notification): AppNotificationResource
    {
        abort_unless($notification->user_id === $request->user()->id, 403);

        if ($notification->read_at === null) {
            $notification->update(['read_at' => now()]);
        }

        return new AppNotificationResource($notification);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->appNotifications()
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json(['status' => 'ok']);
    }
}
