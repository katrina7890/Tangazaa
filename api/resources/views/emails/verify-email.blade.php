<x-mail.layout
    heading="Confirm your email address"
    eyebrow="Welcome to Tangazaa"
    preheader="One click and your Tangazaa account is ready."
>
    <x-mail.text>
        Hi {{ $name }} — your Tangazaa account is set up. Confirm this address so we can send
        you booking confirmations, payment receipts and campaign updates.
    </x-mail.text>

    <x-mail.button :url="$url">Confirm my email</x-mail.button>

    <x-mail.text muted>
        This link expires in {{ $expiresMinutes }} minutes. If it does, request a new one from your
        dashboard. If you didn't create a Tangazaa account, you can ignore this email.
    </x-mail.text>
</x-mail.layout>
