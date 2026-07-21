{{--
  Payment receipt PDF. Rendered by App\Services\Documents\DocumentService via
  dompdf, which supports only a conservative CSS subset — plain block layout
  and tables, no flex/grid, and only the built-in font families.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 40px 44px; }
        body { font-family: Helvetica, Arial, sans-serif; color: #241c16; font-size: 12px; line-height: 1.55; }
        .wordmark { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        .accent { color: #8a3df0; }
        .muted { color: #6f6558; }
        .eyebrow { font-size: 9px; font-weight: bold; letter-spacing: 1.3px; text-transform: uppercase; color: #8a3df0; }
        h1 { font-size: 22px; margin: 4px 0 2px; }
        .rule { border-bottom: 1px solid #ddd2bf; margin: 18px 0; }
        table { width: 100%; border-collapse: collapse; }
        .kv td { padding: 7px 0; border-bottom: 1px solid #eee3d2; }
        .kv td.label { color: #6f6558; width: 46%; }
        .kv td.value { text-align: right; font-weight: bold; }
        .total { background: #f8ecdc; border: 1px solid #ddd2bf; padding: 14px 16px; margin-top: 14px; }
        .total .amount { font-size: 20px; font-weight: bold; }
        .paid { display: inline-block; background: #16704a; color: #ffffff; padding: 4px 12px; font-size: 10px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; }
        .foot { margin-top: 26px; font-size: 10px; color: #6f6558; }
    </style>
</head>
<body>
    <table>
        <tr>
            <td><span class="wordmark">TANGAZ<span class="accent">AA</span></span></td>
            <td style="text-align: right;"><span class="paid">Paid</span></td>
        </tr>
    </table>

    <div class="rule"></div>

    <p class="eyebrow">Payment receipt</p>
    <h1>{{ $payment->reference }}</h1>
    <p class="muted" style="margin-top:0;">Issued {{ $payment->paid_at?->format('j F Y, H:i') ?? now()->format('j F Y, H:i') }}</p>

    <div class="rule"></div>

    <table style="margin-bottom: 6px;">
        <tr>
            <td style="width:50%; vertical-align: top;">
                <p class="eyebrow">Billed to</p>
                <strong>{{ $customer->company_name ?: $customer->name }}</strong><br>
                <span class="muted">{{ $customer->name }}</span><br>
                <span class="muted">{{ $customer->email }}</span>
                @if ($customer->phone)<br><span class="muted">{{ $customer->phone }}</span>@endif
            </td>
            <td style="width:50%; vertical-align: top;">
                <p class="eyebrow">Media owner</p>
                <strong>{{ $owner->company_name ?: $owner->name }}</strong><br>
                @if ($settings?->contact_email)<span class="muted">{{ $settings->contact_email }}</span><br>@endif
                @if ($settings?->contact_phone)<span class="muted">{{ $settings->contact_phone }}</span>@endif
            </td>
        </tr>
    </table>

    <div class="rule"></div>

    <table class="kv">
        <tr><td class="label">Billboard</td><td class="value">{{ $booking->billboard->title }}</td></tr>
        <tr><td class="label">Location</td><td class="value">{{ $booking->billboard->location }}</td></tr>
        <tr><td class="label">Campaign dates</td><td class="value">{{ $booking->start_date->format('j M Y') }} – {{ $booking->end_date->format('j M Y') }}</td></tr>
        <tr><td class="label">Duration</td><td class="value">{{ $days }} days</td></tr>
        <tr><td class="label">Rate</td><td class="value">KES {{ number_format($booking->billboard->price_per_day) }} / day</td></tr>
        <tr><td class="label">Payment method</td><td class="value">{{ ucfirst($payment->channel) }}</td></tr>
        <tr><td class="label">Contract reference</td><td class="value">{{ $booking->contractNumber() }}</td></tr>
    </table>

    <div class="total">
        <table>
            <tr>
                <td><strong>Total paid</strong></td>
                <td style="text-align: right;"><span class="amount">KES {{ number_format($payment->amount) }}</span></td>
            </tr>
        </table>
    </div>

    <p class="foot">
        This receipt confirms payment in full for the campaign above. Your booking is confirmed and
        the dates are locked. Questions? Reply to your campaign thread in the Tangazaa dashboard.
    </p>
</body>
</html>
