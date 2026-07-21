<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Http\Requests\Partner\AssignAccountManagerRequest;
use App\Http\Resources\BookingResource;
use App\Models\AppNotification;
use App\Models\Booking;
use App\Models\BookingStage;
use App\Services\Mail\CustomerMailer;
use Illuminate\Support\Facades\Gate;

/**
 * Puts a named salesperson in front of the client for a campaign.
 *
 * The customer's single biggest question after paying is "who do I call?" —
 * assigning here answers it in the dashboard and by email in one step.
 */
class AccountManagerController extends Controller
{
    public function update(AssignAccountManagerRequest $request, Booking $booking): BookingResource
    {
        Gate::authorize('update', [BookingStage::class, $booking]);

        $managerId = $request->input('account_manager_id');
        // Re-saving the same person shouldn't re-introduce them to the client.
        $changed = $booking->account_manager_id !== $managerId;

        $booking->update([
            'account_manager_id' => $managerId,
            'account_manager_assigned_at' => $managerId ? now() : null,
        ]);

        $booking->load('accountManager', 'billboard.owner', 'customer');

        if ($changed && $managerId) {
            app(CustomerMailer::class)->campaignManagerAssigned($booking);

            if ($booking->customer_id) {
                AppNotification::notify(
                    $booking->customer_id,
                    'campaign.manager',
                    $booking->accountManager->name.' is running your campaign',
                    "Your contact at {$booking->billboard->owner->company_name} for {$booking->billboard->title}.",
                );
            }
        }

        return new BookingResource($booking);
    }
}
