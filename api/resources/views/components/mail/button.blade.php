{{--
  Bulletproof-ish CTA: a table wrapper rather than a padded <a>, because
  Outlook collapses padding on inline anchors. Signature Purple is dark, so
  the label is always white (see the palette note in CLAUDE.md).
--}}
@props(['url'])
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 22px;">
    <tr>
        <td align="center" bgcolor="#8a3df0" style="border-radius:999px;">
            <a href="{{ $url }}"
               style="display:inline-block; padding:13px 28px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:999px;">
                {{ $slot }}
            </a>
        </td>
    </tr>
</table>
