<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\WorkOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\StoreWorkOrderRequest;
use App\Http\Requests\Partner\UpdateWorkOrderRequest;
use App\Http\Resources\WorkOrderResource;
use App\Models\WorkOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class WorkOrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $workOrders = $request->user()->workOrders()
            ->with(['billboard', 'artwork'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->when($request->filled('type'), fn ($query) => $query->where('type', $request->string('type')))
            ->orderByRaw('scheduled_for is null, scheduled_for asc')
            ->latest()
            ->get();

        return WorkOrderResource::collection($workOrders);
    }

    public function store(StoreWorkOrderRequest $request): JsonResponse
    {
        // Explicit default: the DB column default doesn't hydrate the in-memory
        // model, and the resource needs a real enum to serialize.
        $data = $request->validated();
        $data['status'] = $data['status'] ?? WorkOrderStatus::Pending->value;

        $workOrder = $request->user()->workOrders()->create($data);

        return (new WorkOrderResource($workOrder->load(['billboard', 'artwork'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateWorkOrderRequest $request, WorkOrder $workOrder): WorkOrderResource
    {
        Gate::authorize('update', $workOrder);

        $data = $request->validated();

        // Stamp/unstamp completion time as the job moves through the workflow.
        if (($data['status'] ?? null) === WorkOrderStatus::Completed->value) {
            $data['completed_at'] = $workOrder->completed_at ?? now();
        } elseif (isset($data['status'])) {
            $data['completed_at'] = null;
        }

        $workOrder->update($data);

        return new WorkOrderResource($workOrder->load(['billboard', 'artwork']));
    }

    public function destroy(Request $request, WorkOrder $workOrder): Response
    {
        Gate::authorize('delete', $workOrder);

        $workOrder->delete();

        return response()->noContent();
    }
}
