{{--
  Label/value summary block (campaign dates, totals, references).
  `$rows` is an ordered [label => value] map; nulls are skipped so callers can
  pass optional fields without wrapping each one in an @if.
--}}
@props(['rows' => []])
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="margin:4px 0 22px; background-color:#f8ecdc; border:1px solid #ddd2bf; border-radius:14px;">
    @foreach (array_filter($rows, fn ($value) => $value !== null && $value !== '') as $label => $value)
        <tr>
            <td style="padding:11px 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; color:#6f6558; {{ ! $loop->last ? 'border-bottom:1px solid #ddd2bf;' : '' }}">
                {{ $label }}
            </td>
            <td align="right" style="padding:11px 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:13px; font-weight:700; color:#241c16; {{ ! $loop->last ? 'border-bottom:1px solid #ddd2bf;' : '' }}">
                {{ $value }}
            </td>
        </tr>
    @endforeach
</table>
