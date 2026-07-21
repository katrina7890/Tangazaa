<?php

namespace App\Services\Documents;

use App\Enums\BillboardType;
use App\Enums\PaymentStatus;
use App\Models\Booking;
use App\Models\Payment;
use Barryvdh\DomPDF\Facade\Pdf;

/**
 * Renders the customer-facing PDFs (payment receipt, booking contract).
 *
 * Documents are generated on demand rather than stored: they're pure functions
 * of the booking/payment rows, so there's nothing to keep in sync and nothing
 * to lose when Render recycles its ephemeral disk.
 */
class DocumentService
{
    /**
     * Plain-language summary of what the platform actually enforces. Swap for
     * counsel-reviewed terms without touching the rendering pipeline.
     */
    private const CLAUSES = [
        'The media owner grants the advertiser exclusive display rights to the site named above for the full campaign period, subject to payment in full.',
        'Campaigns run for a minimum of 30 days. The dates above are held for the advertiser only once payment has been received; until then the site remains available to other advertisers.',
        'The advertiser supplies final artwork by the agreed deadline. Where the media owner provides design or printing services, those are quoted separately and are not included in the total above unless stated.',
        'The media owner is responsible for printing (where contracted), installation, and keeping the site in good condition — including lighting where the site is lit — for the duration of the campaign.',
        'The media owner will post installation evidence and campaign progress to the Tangazaa dashboard, where the advertiser can review and respond to each stage.',
        'Cancellation by the advertiser after payment is subject to the media owner\'s refund policy. Cancellation by the media owner after payment entitles the advertiser to a full refund of amounts paid for unserved days.',
        'Neither party is liable for failure to perform caused by events beyond reasonable control, including regulatory action affecting the site, extreme weather, or damage by third parties.',
        'This agreement is governed by the laws of Kenya.',
    ];

    /** @return array{0: string, 1: string} The PDF bytes and a filename. */
    public function receipt(Payment $payment): array
    {
        $booking = $payment->booking->loadMissing('billboard.owner.partnerSettings', 'customer');
        $owner = $booking->billboard->owner;

        $pdf = Pdf::loadView('documents.receipt', [
            'payment' => $payment,
            'booking' => $booking,
            'customer' => $booking->customer,
            'owner' => $owner,
            'settings' => $owner->partnerSettings,
            'days' => $this->days($booking),
        ]);

        return [$pdf->output(), "tangazaa-receipt-{$payment->reference}.pdf"];
    }

    /** @return array{0: string, 1: string} The PDF bytes and a filename. */
    public function contract(Booking $booking): array
    {
        $booking->loadMissing('billboard.owner.partnerSettings', 'customer', 'accountManager', 'payments');
        $owner = $booking->billboard->owner;

        $pdf = Pdf::loadView('documents.contract', [
            'booking' => $booking,
            'customer' => $booking->customer,
            'owner' => $owner,
            'settings' => $owner->partnerSettings,
            'manager' => $booking->accountManager,
            'days' => $this->days($booking),
            'typeLabel' => $this->typeLabel($booking->billboard->type),
            'paid' => $booking->payments->contains(fn (Payment $p) => $p->status === PaymentStatus::Success),
            'clauses' => self::CLAUSES,
        ]);

        return [$pdf->output(), 'tangazaa-contract-'.$booking->contractNumber().'.pdf'];
    }

    private function days(Booking $booking): int
    {
        return (int) $booking->start_date->diffInDays($booking->end_date) + 1;
    }

    private function typeLabel(BillboardType|string|null $type): string
    {
        $value = $type instanceof BillboardType ? $type->value : (string) $type;

        return match ($value) {
            'standard_4x3' => 'Standard 4x3 billboard',
            'digital_led' => 'Digital LED screen',
            'gantry' => 'Gantry',
            'wall_wrap' => 'Wall wrap',
            default => 'Billboard',
        };
    }
}
