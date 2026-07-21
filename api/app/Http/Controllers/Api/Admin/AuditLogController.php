<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only view over the immutable audit trail. There is deliberately no
 * write, edit or delete endpoint — entries are created only by AuditLogger as
 * a side effect of the action being recorded.
 */
class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::query()
            ->when($request->filled('action'), fn ($query) => $query->where('action', $request->string('action')))
            ->when($request->filled('actor_id'), fn ($query) => $query->where('actor_id', $request->integer('actor_id')))
            ->when($request->filled('target_type'), fn ($query) => $query->where('target_type', $request->string('target_type')))
            ->when($request->filled('from'), fn ($query) => $query->where('created_at', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($query) => $query->where('created_at', '<=', $request->date('to')->endOfDay()))
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->string('search').'%';
                $query->where(fn ($inner) => $inner
                    ->where('actor_name', 'like', $term)
                    ->orWhere('actor_email', 'like', $term)
                    ->orWhere('target_label', 'like', $term)
                    ->orWhere('action', 'like', $term));
            })
            ->latest('id')
            ->paginate(perPage: min($request->integer('per_page', 25), 100))
            ->withQueryString();

        return response()->json([
            'data' => collect($logs->items())->map(fn (AuditLog $log) => [
                'id' => $log->id,
                'action' => $log->action,
                'actor' => $log->actor_name ? [
                    'id' => $log->actor_id,
                    'name' => $log->actor_name,
                    'email' => $log->actor_email,
                ] : null,
                'target' => $log->target_type ? [
                    'type' => $log->target_type,
                    'id' => $log->target_id,
                    'label' => $log->target_label,
                ] : null,
                'changes' => $log->changes,
                'ip_address' => $log->ip_address,
                'created_at' => $log->created_at->toIso8601String(),
            ]),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
            // Distinct actions present in the trail, so the UI filter offers
            // only values that actually exist.
            'actions' => AuditLog::query()->distinct()->orderBy('action')->pluck('action'),
        ]);
    }
}
