<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\StoreContactRequest;
use App\Http\Resources\ContactResource;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

class ContactController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $contacts = $request->user()->contacts()
            ->withCount(['bookings', 'artworks'])
            ->when($request->filled('search'), function ($query) use ($request) {
                $term = '%'.$request->string('search').'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $term)
                    ->orWhere('company', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('phone', 'like', $term));
            })
            ->orderBy('name')
            ->get();

        return ContactResource::collection($contacts);
    }

    public function store(StoreContactRequest $request): JsonResponse
    {
        $contact = $request->user()->contacts()->create($request->validated());

        return (new ContactResource($contact))->response()->setStatusCode(201);
    }

    public function update(StoreContactRequest $request, Contact $contact): ContactResource
    {
        Gate::authorize('update', $contact);

        $contact->update($request->validated());

        return new ContactResource($contact);
    }

    public function destroy(Request $request, Contact $contact): Response
    {
        Gate::authorize('delete', $contact);

        $contact->delete();

        return response()->noContent();
    }
}
