<x-mail.layout
    heading="Your booking has been cancelled"
    eyebrow="Booking cancelled"
    :preheader="$booking->billboard->title.' — '.$booking->start_date->format('j M Y').' to '.$booking->end_date->format('j M Y')"
    :manageUrl="$manageUrl"
>
    <x-mail.text>
        @if ($byCustomer)
            Hi {{ $name }} — we've cancelled your booking as requested. Nothing further is owed on it.
        @else
            Hi {{ $name }} — your booking below has been cancelled. If this is a surprise, contact
            {{ $company }} and they'll explain what happened.
        @endif
    </x-mail.text>

    <x-mail.details :rows="[
        'Billboard' => $booking->billboard->title,
        'Location' => $booking->billboard->location,
        'Dates' => $booking->start_date->format('j M Y').' – '.$booking->end_date->format('j M Y'),
        'Value' => 'KES '.number_format($booking->total_price),
        'Company' => $company,
        'Contact' => $companyEmail,
    ]" />

    @if ($wasPaid)
        <x-mail.text>
            <strong>You had already paid for this campaign.</strong> {{ $company }} will be in touch
            about your refund — if you haven't heard within a few working days, reply to your
            campaign thread or contact them directly.
        </x-mail.text>
    @endif

    <x-mail.text>
        Those dates are open again, and so is the rest of the network.
    </x-mail.text>

    <x-mail.button :url="$browseUrl">Browse billboards</x-mail.button>
</x-mail.layout>
