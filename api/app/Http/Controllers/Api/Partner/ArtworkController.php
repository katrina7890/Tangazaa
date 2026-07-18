<?php

namespace App\Http\Controllers\Api\Partner;

use App\Enums\ArtworkStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\StoreArtworkRequest;
use App\Http\Requests\Partner\UpdateArtworkRequest;
use App\Http\Resources\ArtworkResource;
use App\Models\Artwork;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ArtworkController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $artworks = $request->user()->partnerOwner()->artworks()
            ->with(['contact', 'billboard'])
            ->when($request->filled('status'), fn ($query) => $query->where('status', $request->string('status')))
            ->latest()
            ->get();

        return ArtworkResource::collection($artworks);
    }

    public function store(StoreArtworkRequest $request): JsonResponse
    {
        // Explicit default: the DB column default doesn't hydrate the in-memory
        // model, and the resource needs a real enum to serialize.
        $data = $request->validated();
        $data['status'] = $data['status'] ?? ArtworkStatus::Brief->value;

        $artwork = $request->user()->partnerOwner()->artworks()->create($data);

        return (new ArtworkResource($artwork->load(['contact', 'billboard'])))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateArtworkRequest $request, Artwork $artwork): ArtworkResource
    {
        Gate::authorize('update', $artwork);

        $artwork->update($request->validated());

        return new ArtworkResource($artwork->load(['contact', 'billboard']));
    }

    public function destroy(Request $request, Artwork $artwork): Response
    {
        Gate::authorize('delete', $artwork);

        $artwork->delete();

        return response()->noContent();
    }
}
