<?php

namespace App\Enums;

enum ArtworkStatus: string
{
    case Brief = 'brief';
    case InDesign = 'in_design';
    case AwaitingApproval = 'awaiting_approval';
    case Approved = 'approved';
    case Rejected = 'rejected';
}
