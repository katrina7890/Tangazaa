{{-- Body copy. `muted` is the smaller grey variant used for caveats. --}}
@props(['muted' => false])
<p style="margin:0 0 16px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:{{ $muted ? '13px' : '15px' }}; line-height:1.65; color:{{ $muted ? '#6f6558' : '#4a4034' }};">
    {{ $slot }}
</p>
