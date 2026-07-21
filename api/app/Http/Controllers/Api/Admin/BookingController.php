<?php

namespace App\Http\Controllers\Api\Admin;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\Mail\CustomerMailer;
use App\Services\Security\AuditLogger;
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

    public function cancel(Booking $booking, AuditLogger $audit): BookingResource
    {
        $before = $booking->status->value;
        $booking->update(['status' => BookingStatus::Cancelled]);

        $audit->record(
            action: 'booking.cancelled',
            target: $booking,
            before: ['status' => $before],
            after: ['status' => $booking->status->value],
            targetLabel: $booking->billboard->title,
        );

        app(CustomerMailer::class)->bookingCancelled($booking, byCustomer: false);

        return new BookingResource($booking->load(['billboard', 'customer']));
    }
}
