<?php

namespace App\Enums;

/**
 * How the customer chose to pay.
 *
 * Recorded on the payment and shown on the receipt. The gateway is still
 * simulated (see PaystackService), so this is the customer's stated choice
 * rather than a settled rail — but Paystack supports both for real in Kenya,
 * and M-Pesa is the dominant method there, so the choice is worth capturing.
 */
enum PaymentChannel: string
{
    case Mpesa = 'mpesa';
    case Card = 'card';

    public function label(): string
    {
        return match ($this) {
            self::Mpesa => 'M-Pesa',
            self::Card => 'Card',
        };
    }
}
