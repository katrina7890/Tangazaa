<?php

namespace App\Http\Controllers\Api\Partner;

use App\Http\Controllers\Controller;
use App\Services\Partner\ReminderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReminderController extends Controller
{
    /** What needs the team's attention — computed fresh on every call. */
    public function __invoke(Request $request, ReminderService $reminders): JsonResponse
    {
        return response()->json([
            'data' => $reminders->for($request->user()->partnerOwner()),
        ]);
    }
}
