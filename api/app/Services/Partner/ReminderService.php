<?php

namespace App\Services\Partner;

use App\Enums\BookingSource;
use App\Enums\BookingStatus;
use App\Enums\PipelineStage;
use App\Enums\WorkOrderStatus;
use App\Enums\WorkOrderType;
use App\Models\Booking;
use App\Models\User;

/**
 * Computed (not stored) reminders for the Partner ERP: what needs the team's
 * attention today, derived from bookings, pipeline stages and work orders.
 */
class ReminderService
{
    /** @return array<int, array<string, mixed>> */
    public function for(User $owner): array
    {
        $today = now()->startOfDay();
        $tomorrow = $today->copy()->addDay();

        $bookings = Booking::query()
            ->whereHas('billboard', fn ($query) => $query->where('owner_id', $owner->id))
            ->where('status', BookingStatus::Confirmed)
            ->where('end_date', '>=', $today->copy()->subDays(30))
            ->with(['billboard', 'stages', 'customer', 'contact'])
            ->get();

        $reminders = collect();

        foreach ($bookings as $booking) {
            $done = $booking->stages
                ->whereNotNull('completed_at')
                ->map(fn ($stage) => $stage->stage->value);
            $advertiser = $booking->customer?->company_name
                ?? $booking->customer?->name
                ?? $booking->contact?->company
                ?? $booking->contact?->name
                ?? 'Client';

            $startsSoon = $booking->start_date >= $today && $booking->start_date <= $today->copy()->addDays(7);
            $started = $booking->start_date <= $today;

            if (($startsSoon || $started) && ! $done->contains(PipelineStage::Artwork->value)) {
                $reminders->push($this->reminder('artwork_overdue', $booking,
                    'Artwork overdue — '.$booking->billboard->title,
                    $advertiser.' · campaign starts '.$booking->start_date->format('M j')));
            } elseif (($started || $booking->start_date <= $today->copy()->addDays(3))
                && $done->contains(PipelineStage::Artwork->value)
                && ! $done->contains(PipelineStage::Printing->value)) {
                $reminders->push($this->reminder('printing_overdue', $booking,
                    'Printing overdue — '.$booking->billboard->title,
                    $advertiser.' · campaign starts '.$booking->start_date->format('M j')));
            }

            if ($booking->start_date->eq($tomorrow)) {
                $reminders->push($this->reminder('campaign_starting', $booking,
                    'Campaign starts tomorrow — '.$booking->billboard->title, $advertiser));
                if (! $done->contains(PipelineStage::Installed->value)) {
                    $reminders->push($this->reminder('installation_due', $booking,
                        'Installation needed by tomorrow — '.$booking->billboard->title, $advertiser));
                }
            }

            if ($booking->end_date >= $today && $booking->end_date <= $today->copy()->addDays(7)) {
                $reminders->push($this->reminder('campaign_ending', $booking,
                    'Campaign ending '.$booking->end_date->format('M j').' — '.$booking->billboard->title,
                    $advertiser));
            }

            if ($booking->end_date < $today
                && ($booking->source?->value ?? 'app') === BookingSource::App->value
                && ! $done->contains(PipelineStage::PaymentReleased->value)) {
                $reminders->push($this->reminder('payment_release', $booking,
                    'Vendor payment ready to release — '.$booking->billboard->title,
                    'Campaign ended '.$booking->end_date->format('M j')));
            }
        }

        // Installations booked in the jobs module for tomorrow.
        $owner->workOrders()
            ->where('type', WorkOrderType::Installation)
            ->whereIn('status', [WorkOrderStatus::Pending, WorkOrderStatus::Scheduled])
            ->whereDate('scheduled_for', $tomorrow)
            ->with('billboard')
            ->get()
            ->each(fn ($order) => $reminders->push([
                'type' => 'installation_tomorrow',
                'booking_id' => null,
                'title' => 'Installation tomorrow — '.($order->billboard?->title ?? 'unassigned board'),
                'detail' => $order->assignee_name,
            ]));

        return $reminders->values()->all();
    }

    /** @return array<string, mixed> */
    private function reminder(string $type, Booking $booking, string $title, ?string $detail): array
    {
        return [
            'type' => $type,
            'booking_id' => $booking->id,
            'title' => $title,
            'detail' => $detail,
        ];
    }
}
