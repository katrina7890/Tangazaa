<x-mail.layout
    :heading="$update->requires_approval ? 'They need your go-ahead' : $stage.' — an update'"
    :eyebrow="$update->requires_approval ? 'Action needed' : 'Campaign update'"
    :preheader="$company.' posted an update on '.$booking->billboard->title"
    :manageUrl="$manageUrl"
>
    <x-mail.text>
        Hi {{ $name }} — {{ $company }} has moved your campaign on
        <strong>{{ $booking->billboard->title }}</strong> to <strong>{{ $stage }}</strong>.
    </x-mail.text>

    @if ($update->message)
        {{-- Quoted rather than presented as our own copy: this is the company's words. --}}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
            <tr>
                <td style="padding:14px 18px; background-color:#f8ecdc; border-left:3px solid #8a3df0; border-radius:0 12px 12px 0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; line-height:1.6; color:#4a4034;">
                    “{{ $update->message }}”
                </td>
            </tr>
        </table>
    @endif

    @if ($photoCount > 0)
        <x-mail.text>
            They attached {{ $photoCount }} {{ \Illuminate\Support\Str::plural('photo', $photoCount) }} —
            view {{ $photoCount === 1 ? 'it' : 'them' }} on your campaign tracker.
        </x-mail.text>
    @endif

    @if ($update->requires_approval)
        <x-mail.text>
            <strong>Before they go further they need your approval.</strong> Give the go-ahead — or
            ask for changes — on your tracker:
        </x-mail.text>
        <x-mail.button :url="$trackUrl">Review and respond</x-mail.button>
    @else
        <x-mail.button :url="$trackUrl">View campaign tracker</x-mail.button>
    @endif
</x-mail.layout>
