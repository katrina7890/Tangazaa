<?php

namespace App\Enums;

/**
 * The customer's response to a progress update. `approved` is only valid on
 * updates that asked for approval (e.g. "good to print?"); `liked` /
 * `changes_requested` are lightweight feedback on any other update.
 */
enum ClientReaction: string
{
    case Approved = 'approved';
    case Liked = 'liked';
    case ChangesRequested = 'changes_requested';
}
