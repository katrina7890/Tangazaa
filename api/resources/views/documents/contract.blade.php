{{--
  Campaign booking agreement PDF — the written record of a confirmed booking,
  generated from real booking data only. Same dompdf CSS constraints as the
  receipt: block layout and tables, no flex/grid.

  The clause text is a plain-language summary of what the platform actually
  enforces (30-day minimum, pay-to-hold, lead times, cancellation). If the
  business needs counsel-reviewed terms, replace the CLAUSES array here — the
  rendering and delivery pipeline doesn't change.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <style>
        @page { margin: 40px 44px; }
        body { font-family: Helvetica, Arial, sans-serif; color: #241c16; font-size: 11.5px; line-height: 1.6; }
        .wordmark { font-size: 18px; font-weight: bold; letter-spacing: 1px; }
        .accent { color: #8a3df0; }
        .muted { color: #6f6558; }
        .eyebrow { font-size: 9px; font-weight: bold; letter-spacing: 1.3px; text-transform: uppercase; color: #8a3df0; }
        h1 { font-size: 21px; margin: 4px 0 2px; }
        h2 { font-size: 12px; margin: 20px 0 6px; text-transform: uppercase; letter-spacing: 1px; }
        .rule { border-bottom: 1px solid #ddd2bf; margin: 16px 0; }
        table { width: 100%; border-collapse: collapse; }
        .kv td { padding: 6px 0; border-bottom: 1px solid #eee3d2; }
        .kv td.label { color: #6f6558; width: 42%; }
        .kv td.value { text-align: right; font-weight: bold; }
        ol { padding-left: 16px; margin: 0; }
        ol li { margin-bottom: 7px; }
        .sign { margin-top: 26px; }
        .sign td { padding-top: 34px; border-bottom: 1px solid #241c16; width: 44%; }
        .sign .caption { border: none; padding-top: 5px; font-size: 10px; color: #6f6558; }
        .foot { margin-top: 22px; font-size: 9.5px; color: #6f6558; }
    </style>
</head>
<body>
    <table>
        <tr>
            <td><span class="wordmark">TANGAZ<span class="accent">AA</span></span></td>
            <td style="text-align: right;" class="muted">{{ $booking->contractNumber() }}</td>
        </tr>
    </table>

    <div class="rule"></div>

    <p class="eyebrow">Campaign booking agreement</p>
    <h1>{{ $booking->billboard->title }}</h1>
    <p class="muted" style="margin-top:0;">
        Issued {{ now()->format('j F Y') }} · Booking #{{ $booking->id }}
    </p>

    <h2>Parties</h2>
    <table>
        <tr>
            <td style="width:50%; vertical-align: top;">
                <p class="eyebrow">Advertiser</p>
                <strong>{{ $customer->company_name ?: $customer->name }}</strong><br>
                <span class="muted">Represented by {{ $customer->name }}</span><br>
                <span class="muted">{{ $customer->email }}</span>
                @if ($customer->phone)<br><span class="muted">{{ $customer->phone }}</span>@endif
            </td>
            <td style="width:50%; vertical-align: top;">
                <p class="eyebrow">Media owner</p>
                <strong>{{ $owner->company_name ?: $owner->name }}</strong><br>
                @if ($settings?->contact_email)<span class="muted">{{ $settings->contact_email }}</span><br>@endif
                @if ($settings?->contact_phone)<span class="muted">{{ $settings->contact_phone }}</span>@endif
                @if ($manager)
                    <br><span class="muted">Campaign manager: {{ $manager->name }}</span>
                @endif
            </td>
        </tr>
    </table>

    <h2>Media placement</h2>
    <table class="kv">
        <tr><td class="label">Site</td><td class="value">{{ $booking->billboard->title }}</td></tr>
        <tr><td class="label">Location</td><td class="value">{{ $booking->billboard->location }}</td></tr>
        <tr><td class="label">Format</td><td class="value">{{ $typeLabel }}{{ $booking->billboard->size ? ' · '.$booking->billboard->size : '' }}</td></tr>
        <tr><td class="label">Campaign period</td><td class="value">{{ $booking->start_date->format('j M Y') }} – {{ $booking->end_date->format('j M Y') }}</td></tr>
        <tr><td class="label">Duration</td><td class="value">{{ $days }} days</td></tr>
        <tr><td class="label">Rate</td><td class="value">KES {{ number_format($booking->billboard->price_per_day) }} / day</td></tr>
        <tr><td class="label">Total contract value</td><td class="value">KES {{ number_format($booking->total_price) }}</td></tr>
        <tr><td class="label">Payment status</td><td class="value">{{ $paid ? 'Paid in full' : 'Awaiting payment' }}</td></tr>
    </table>

    <h2>Terms</h2>
    <ol>
        @foreach ($clauses as $clause)
            <li>{{ $clause }}</li>
        @endforeach
    </ol>

    <table class="sign">
        <tr>
            <td></td>
            <td style="border:none; width:12%;"></td>
            <td></td>
        </tr>
        <tr>
            <td class="caption">For the advertiser — {{ $customer->company_name ?: $customer->name }}</td>
            <td style="border:none;"></td>
            <td class="caption">For the media owner — {{ $owner->company_name ?: $owner->name }}</td>
        </tr>
    </table>

    <p class="foot">
        Generated by Tangazaa on {{ now()->format('j F Y \a\t H:i') }}. This document reflects the
        booking record held on the platform at the time of generation. Reference {{ $booking->contractNumber() }}.
    </p>
</body>
</html>
