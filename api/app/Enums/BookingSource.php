<?php

namespace App\Enums;

enum BookingSource: string
{
    case App = 'app';
    case Offline = 'offline';
}
