# Tangazaa demo launcher — serves the whole app (React SPA + Laravel API) on a
# public Cloudflare tunnel from a single origin, so cookie login works.
#
# Usage (from the Tangaza folder):
#   powershell -ExecutionPolicy Bypass -File .\run-demo.ps1
#
# Prereqs (already set up): cloudflared.exe in this folder, and the SPA build
# copied into api/public (re-run "npm run build" in tangaza/ then copy build/*
# into api/public/ if you change the frontend).
#
# Press Ctrl+C to stop — that shuts the tunnel and restores .env for local dev.

$ErrorActionPreference = "Stop"
$root    = $PSScriptRoot
$api     = Join-Path $root "api"
$cf      = Join-Path $root "cloudflared.exe"
$envPath = Join-Path $api ".env"
$backup  = Join-Path $api ".env.demobak"
$log     = Join-Path $root "cloudflared.log"

Copy-Item $envPath $backup -Force

function Restore-Env {
    if (Test-Path $backup) { Copy-Item $backup $envPath -Force; Remove-Item $backup -Force }
    Write-Host "`n.env restored to local-dev settings."
}

# Free port 8000
Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique |
    ForEach-Object { try { Stop-Process -Id $_ -Force } catch {} }

# Start the tunnel and capture its URL
if (Test-Path $log) { Remove-Item $log -Force }
$cfProc = Start-Process -FilePath $cf -ArgumentList @("tunnel","--url","http://localhost:8000","--logfile",$log) -PassThru -WindowStyle Hidden

$url = $null
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $log) {
        $m = [regex]::Match((Get-Content $log -Raw -ErrorAction SilentlyContinue), "https://[a-z0-9-]+\.trycloudflare\.com")
        if ($m.Success) { $url = $m.Value; break }
    }
}
if (-not $url) { Write-Error "Could not read tunnel URL from $log"; try { Stop-Process -Id $cfProc.Id -Force } catch {}; exit 1 }
$h = ([Uri]$url).Host

# Point .env at the tunnel host (single origin)
$c = Get-Content $envPath -Raw
$c = $c -replace "(?m)^APP_URL=.*$",                 "APP_URL=$url"
$c = $c -replace "(?m)^FRONTEND_URLS=.*$",           "FRONTEND_URLS=$url"
$c = $c -replace "(?m)^SANCTUM_STATEFUL_DOMAINS=.*$", "SANCTUM_STATEFUL_DOMAINS=$h"
$c = $c -replace "(?m)^SESSION_DOMAIN=.*$",           "SESSION_DOMAIN=$h"
[IO.File]::WriteAllText($envPath, $c, (New-Object Text.UTF8Encoding $false))

Write-Host "`n============================================================"
Write-Host "  Tangazaa is LIVE at:  $url"
Write-Host "  (share this URL; Ctrl+C here to stop and restore dev .env)"
Write-Host "============================================================`n"

Push-Location $api
try {
    php artisan config:clear | Out-Null
    php artisan serve --port=8000 --host=127.0.0.1
} finally {
    Pop-Location
    try { Stop-Process -Id $cfProc.Id -Force } catch {}
    Restore-Env
}
