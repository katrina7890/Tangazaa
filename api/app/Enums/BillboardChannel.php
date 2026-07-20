<?php

namespace App\Enums;

/**
 * Where a billboard is sold. `Online` boards are listed on the Tangazaa
 * marketplace; `Offline` boards live only in the owner's Partner ERP and are
 * sold through their own traditional channels — the ERP still tracks their
 * occupancy so the owner has one truthful view of the whole portfolio.
 */
enum BillboardChannel: string
{
    case Online = 'online';
    case Offline = 'offline';
}
