<?php

namespace App\Http\Controllers\Api;

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
        $billboards = Billboard::query()
            ->where('is_active', true)
            ->with(['bookings' => fn ($query) => $query->where('status', BookingStatus::Confirmed)])
            ->latest()
            ->get();

        return BillboardResource::collection($billboards);
    }

    public function show(Billboard $billboard): BillboardResource
    {
        $billboard->load(['bookings' => fn ($query) => $query->where('status', BookingStatus::Confirmed)]);

        return new BillboardResource($billboard);
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $billboards = $request->user()
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
        $billboard->update($request->validated());

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
