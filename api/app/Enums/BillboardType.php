<?php

namespace App\Enums;

enum BillboardType: string
{
    case Standard4x3 = 'standard_4x3';
    case DigitalLed = 'digital_led';
    case Gantry = 'gantry';
    case WallWrap = 'wall_wrap';
}
