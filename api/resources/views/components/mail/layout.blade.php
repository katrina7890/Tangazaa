{{--
  Shared shell for every transactional email.

  Deliberately table-based with inline styles: Outlook ignores <style> blocks
  and flexbox/grid entirely, so the house design (Vesper beige surface, obsidian
  ink, purple action) is expressed the only way that survives every client.
  Palette mirrors tangaza/src/index.css — keep the two in step.
--}}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>{{ $title ?? 'Tangazaa' }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f8ecdc; -webkit-font-smoothing:antialiased;">
    {{-- Preheader: the grey line clients show next to the subject in the inbox. --}}
    @isset($preheader)
        <div style="display:none; max-height:0; overflow:hidden; opacity:0; color:transparent; height:0; width:0;">
            {{ $preheader }}
        </div>
    @endisset

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f8ecdc;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px; margin:0 auto;">

                    {{-- Wordmark --}}
                    <tr>
                        <td align="center" style="padding-bottom:24px;">
                            <span style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:20px; font-weight:900; letter-spacing:1px; color:#241c16;">
                                TANGAZ<span style="color:#8a3df0;">AA</span>
                            </span>
                        </td>
                    </tr>

                    {{-- Card --}}
                    <tr>
                        <td style="background-color:#ffffff; border:1px solid #ddd2bf; border-radius:20px; padding:36px 32px;">
                            @isset($eyebrow)
                                <p style="margin:0 0 10px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; font-weight:700; letter-spacing:1.4px; text-transform:uppercase; color:#8a3df0;">
                                    {{ $eyebrow }}
                                </p>
                            @endisset

                            <h1 style="margin:0 0 18px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:26px; line-height:1.25; font-weight:800; letter-spacing:-0.5px; color:#241c16;">
                                {{ $heading }}
                            </h1>

                            {{ $slot }}
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td align="center" style="padding:24px 12px 0;">
                            <p style="margin:0 0 6px; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#6f6558;">
                                Tangazaa — the marketplace for outdoor advertising in Kenya.
                            </p>
                            <p style="margin:0; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#6f6558;">
                                @isset($manageUrl)
                                    <a href="{{ $manageUrl }}" style="color:#8a3df0; text-decoration:underline;">Manage email preferences</a>
                                @endisset
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
