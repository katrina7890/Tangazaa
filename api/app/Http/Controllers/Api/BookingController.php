<?php

namespace App\Http\Controllers\Api;

use App\Actions\Booking\CreateBooking;
use App\Http\Controllers\Controller;
use App\Http\Requests\Booking\StoreBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Billboard;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BookingController extends Controller
{
    public function store(StoreBookingRequest $request, CreateBooking $createBooking): BookingResource
    {
        $billboard = Billboard::findOrFail($request->integer('billboard_id'));

        $booking = $createBooking->handle(
            $request->user(),
            $billboard,
            $request->string('start_date')->toString(),
            $request->string('end_date')->toString(),
        );

        return new BookingResource($booking->load('billboard'));
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $bookings = $request->user()->bookings()->with('billboard')->latest()->get();

        return BookingResource::collection($bookings);
    }
}
