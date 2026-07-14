<?php

namespace App\Http\Controllers\Api\Partner;

use App\Actions\Booking\CreateOfflineBooking;
use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\StoreOfflineBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Billboard;
use App\Models\Booking;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class OfflineBookingController extends Controller
{
    /**
     * Every booking across the owner's billboards — app and offline side by
     * side, so the sync screen shows one truthful schedule.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $bookings = Booking::query()
            ->whereIn('billboard_id', $request->user()->billboards()->select('id'))
            ->with(['billboard', 'customer', 'contact', 'latestPayment'])
            ->when($request->filled('source'), fn ($query) => $query->where('source', $request->string('source')))
            ->latest('start_date')
            ->get();

        return BookingResource::collection($bookings);
    }

    public function store(StoreOfflineBookingRequest $request, CreateOfflineBooking $createOfflineBooking): JsonResponse
    {
        // The form request already proved both belong to this owner.
        $billboard = Billboard::findOrFail($request->integer('billboard_id'));
        $contact = Contact::findOrFail($request->integer('contact_id'));

        $booking = $createOfflineBooking->handle(
            $billboard,
            $contact,
            $request->string('start_date')->toString(),
            $request->string('end_date')->toString(),
            $request->filled('total_price') ? $request->integer('total_price') : null,
        );

        return (new BookingResource($booking->load(['billboard', 'contact'])))
            ->response()
            ->setStatusCode(201);
    }
}
