<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BookingController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:255'],
        ]);

        $bookings = Booking::query()
            ->with(['billboard', 'customer'])
            ->when($request->string('search')->toString(), function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query->whereHas('billboard', fn ($query) => $query->where('title', 'like', "%{$search}%"))
                        ->orWhereHas('customer', fn ($query) => $query->where('name', 'like', "%{$search}%")
                            ->orWhere('company_name', 'like', "%{$search}%"));
                });
            })
            ->latest('id')
            ->paginate(15);

        return BookingResource::collection($bookings);
    }

    public function cancel(Booking $booking): BookingResource
    {
        $booking->update(['status' => BookingStatus::Cancelled]);

        return new BookingResource($booking->load(['billboard', 'customer']));
    }
}
