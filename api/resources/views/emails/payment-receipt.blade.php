<x-mail.layout
    heading="Your campaign is confirmed"
    eyebrow="Payment received"
    preheader="Receipt and contract attached — your dates are locked in."
    :manageUrl="$manageUrl"
>
    <x-mail.text>
        Thanks {{ $name }} — we've received your payment and
        <strong>{{ $booking->billboard->title }}</strong> is now booked in your name. Nobody else
        can take these dates.
    </x-mail.text>

    <x-mail.details :rows="[
        'Receipt reference' => $payment->reference,
        'Amount paid' => 'KES '.number_format($payment->amount),
        'Paid on' => ($payment->paid_at ?? now())->format('j M Y, H:i'),
        'Billboard' => $booking->billboard->title,
        'Campaign dates' => $booking->start_date->format('j M Y').' – '.$booking->end_date->format('j M Y'),
        'Contract reference' => $booking->contractNumber(),
    ]" />

    <x-mail.text>
        Attached to this email you'll find your <strong>payment receipt</strong> and a copy of the
        <strong>campaign booking agreement</strong> between you and {{ $company }}. Both are also
        available any time under Documents in your dashboard.
    </x-mail.text>

    <x-mail.text>
        Next, {{ $company }} starts on artwork and printing. You can follow every stage — with
        photos from the install — as it happens:
    </x-mail.text>

    <x-mail.button :url="$trackUrl">Track my campaign</x-mail.button>
</x-mail.layout>
