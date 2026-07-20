<?php

namespace App\Http\Controllers\Api;

use App\Enums\BillboardChannel;
use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Billboard\StoreBillboardRequest;
use App\Http\Requests\Billboard\UpdateBillboardRequest;
use App\Http\Resources\BillboardResource;
use App\Http\Resources\BookingResource;
use App\Models\Billboard;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class BillboardController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        // The public marketplace only shows boards sold through Tangazaa —
        // offline-channel and under-maintenance inventory is ERP-only.
        $billboards = Billboard::query()
            ->where('is_active', true)
            ->where('channel', BillboardChannel::Online)
            ->where('under_maintenance', false)
            ->whereNull('archived_at')
            // Owners can hide their whole portfolio via Partner settings.
            ->whereDoesntHave('owner.partnerSettings', fn ($query) => $query->where('marketplace_visible', false))
            ->with(['owner.partnerSettings', 'bookings' => fn ($query) => $query->where('status', BookingStatus::Confirmed)])
            ->latest()
            ->get();

        return BillboardResource::collection($billboards);
    }

    public function show(Billboard $billboard): BillboardResource
    {
        // Offline-channel boards are never public (maintenance boards stay
        // viewable — they're just unbookable until the flag clears).
        abort_if($billboard->channel === BillboardChannel::Offline, 404);
        abort_if($billboard->owner->partnerSettings?->marketplace_visible === false, 404);

        $billboard->load(['owner.partnerSettings', 'bookings' => fn ($query) => $query->where('status', BookingStatus::Confirmed)]);

        return new BillboardResource($billboard);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        // partnerOwner(): staff read their employer's inventory (writes stay
        // owner/admin-only at the route level).
        $billboards = $request->user()
            ->partnerOwner()
            ->billboards()
            ->with(['bookings' => fn ($query) => $query->where('status', BookingStatus::Confirmed)])
            ->latest()
            ->get();

        return BillboardResource::collection($billboards);
    }

    public function store(StoreBillboardRequest $request): BillboardResource
    {
        $billboard = $request->user()->billboards()->create($request->validated());

        return new BillboardResource($billboard);
    }

    public function update(UpdateBillboardRequest $request, Billboard $billboard): BillboardResource
    {
        $data = $request->validated();

        // `archived` is a boolean in the API but a timestamp in storage.
        if (array_key_exists('archived', $data)) {
            $data['archived_at'] = $data['archived'] ? ($billboard->archived_at ?? now()) : null;
            unset($data['archived']);
        }

        $billboard->update($data);

        return new BillboardResource($billboard);
    }

    public function destroy(Billboard $billboard): Response
    {
        Gate::authorize('delete', $billboard);

        $billboard->delete();

        return response()->noContent();
    }

    public function bookings(Billboard $billboard): AnonymousResourceCollection
    {
        Gate::authorize('update', $billboard);

        return BookingResource::collection(
            $billboard->bookings()->with(['customer', 'latestPayment'])->latest()->get()
        );
    }
}
