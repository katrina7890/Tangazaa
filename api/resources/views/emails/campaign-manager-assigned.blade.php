<x-mail.layout
    heading="Meet {{ $manager->name }}"
    eyebrow="Your campaign manager"
    preheader="One named contact at {{ $company }} for everything on this campaign."
    :manageUrl="$manageUrl"
>
    <x-mail.text>
        Hi {{ $name }} — {{ $company }} has put <strong>{{ $manager->name }}</strong> in charge of
        your campaign on {{ $booking->billboard->title }}. They'll handle artwork, printing,
        installation and anything else you need from here.
    </x-mail.text>

    <x-mail.details :rows="[
        'Your contact' => $manager->name,
        'Company' => $company,
        'Email' => $manager->email,
        'Phone' => $phone,
        'Available' => $workingHours,
        'Campaign' => $booking->billboard->title,
        'Dates' => $booking->start_date->format('j M Y').' – '.$booking->end_date->format('j M Y'),
    ]" />

    <x-mail.text>
        You can reply straight to this email to reach {{ $manager->name }}, or keep everything in
        one thread on your dashboard:
    </x-mail.text>

    <x-mail.button :url="$chatUrl">Message {{ $manager->name }}</x-mail.button>
</x-mail.layout>
