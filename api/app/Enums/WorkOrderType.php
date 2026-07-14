<?php

namespace App\Enums;

enum WorkOrderType: string
{
    case Printing = 'printing';
    case Installation = 'installation';
    case Removal = 'removal';
    case Maintenance = 'maintenance';
}
