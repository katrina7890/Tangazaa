<?php

namespace App\Http\Controllers\Api;

use App\Enums\BookingStatus;
use App\Enums\PaymentStatus;
use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Payment;
use App\Services\Documents\DocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The customer's paperwork: booking contracts and payment receipts.
 *
 * Nothing is stored — each PDF is rendered on request from the booking record
 * (see DocumentService), so the list here is derived rather than a table.
 */
class DocumentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $bookings = $request->user()->bookings()
            ->with(['billboard.owner', 'payments'])
            ->latest()
            ->get();

        $documents = [];

        foreach ($bookings as $booking) {
            $company = $booking->billboard->owner->company_name ?: $booking->billboard->owner->name;

            // A contract only exists once the booking is actually held.
            if ($booking->status === BookingStatus::Confirmed) {
                $documents[] = [
                    'id' => "contract-{$booking->id}",
                    'type' => 'contract',
                    'title' => 'Campaign booking agreement',
                    'reference' => $booking->contractNumber(),
                    'bookingId' => $booking->id,
                    'billboard' => $booking->billboard->title,
                    'company' => $company,
                    'issuedAt' => $booking->updated_at?->toIso8601String(),
                    'amount' => $booking->total_price,
                    'downloadUrl' => "/api/bookings/{$booking->id}/documents/contract",
                ];
            }

            foreach ($booking->payments->where('status', PaymentStatus::Success) as $payment) {
                $documents[] = [
                    'id' => "receipt-{$payment->id}",
                    'type' => 'receipt',
                    'title' => 'Payment receipt',
                    'reference' => $payment->reference,
                    'bookingId' => $booking->id,
                    'billboard' => $booking->billboard->title,
                    'company' => $company,
                    'issuedAt' => $payment->paid_at?->toIso8601String(),
                    'amount' => $payment->amount,
                    'downloadUrl' => "/api/payments/{$payment->reference}/receipt",
                ];
            }
        }

        // Newest paperwork first, undated last.
        usort($documents, fn ($a, $b) => ($b['issuedAt'] ?? '') <=> ($a['issuedAt'] ?? ''));

        return response()->json(['data' => $documents]);
    }

    public function contract(Request $request, Booking $booking, DocumentService $documents): Response
    {
        abort_unless($booking->customer_id === $request->user()->id, 403);
        abort_if(
            $booking->status !== BookingStatus::Confirmed,
            404,
            'A contract is issued once the booking is confirmed.',
        );

        [$pdf, $filename] = $documents->contract($booking);

        return $this->download($pdf, $filename);
    }

    public function receipt(Request $request, string $reference, DocumentService $documents): Response
    {
        $payment = Payment::where('reference', $reference)->with('booking')->firstOrFail();

        abort_unless($payment->booking->customer_id === $request->user()->id, 403);
        abort_if($payment->status !== PaymentStatus::Success, 404, 'No receipt for an unsettled payment.');

        [$pdf, $filename] = $documents->receipt($payment);

        return $this->download($pdf, $filename);
    }

    private function download(string $pdf, string $filename): Response
    {
        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$filename.'"',
        ]);
    }
}
