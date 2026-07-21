<x-mail.layout
    heading="We've got your booking"
    eyebrow="Booking received"
    preheader="Your dates aren't held until payment clears — here's how to finish."
    :manageUrl="$manageUrl"
>
    <x-mail.text>
        Hi {{ $name }} — {{ $company }} has your request for
        <strong>{{ $booking->billboard->title }}</strong>. Here's what you asked for:
    </x-mail.text>

    <x-mail.details :rows="[
        'Billboard' => $booking->billboard->title,
        'Location' => $booking->billboard->location,
        'Campaign dates' => $booking->start_date->format('j M Y').' – '.$booking->end_date->format('j M Y'),
        'Total' => 'KES '.number_format($booking->total_price),
        'Status' => 'Awaiting payment',
    ]" />

    <x-mail.text>
        <strong>Your dates aren't locked yet.</strong> Another advertiser can still book this site
        until your payment clears, so it's worth finishing now.
    </x-mail.text>

    <x-mail.button :url="$payUrl">Complete payment</x-mail.button>

    <x-mail.text muted>
        Once you've paid we'll send your receipt and a copy of the campaign contract, and
        {{ $company }} will introduce the person running your campaign.
    </x-mail.text>
</x-mail.layout>
