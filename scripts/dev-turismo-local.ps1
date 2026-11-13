# Preview Turismo from repo - stops Docker :3005, ensures backend, Next dev with same-origin /api.
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Turismo = Join-Path $Root 'apps\turismo'

Write-Host 'Ensuring backend for login API (:3002)...' -ForegroundColor Cyan
Set-Location $Root
$stackOk = & (Join-Path $Root 'scripts\ensure-backend-stack.ps1')
if (-not $stackOk) {
  Write-Host 'Continuando - login falha ate backend /health 200.' -ForegroundColor Yellow
}

Write-Host 'Stopping Docker Turismo container...' -ForegroundColor Yellow
$j = Start-Job { docker stop -t 8 rsv360-turismo 2>&1 }
Wait-Job $j -Timeout 30 | Out-Null
Remove-Job $j -Force -ErrorAction SilentlyContinue

$listeners = Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue
foreach ($conn in $listeners) {
  $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
  if ($proc -and $proc.ProcessName -match 'node') {
    Write-Host ('Stopping node PID ' + $proc.Id + ' on port 3005') -ForegroundColor Yellow
    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  }
}
Start-Sleep -Seconds 2

if (-not (Test-Path (Join-Path $Turismo '.env.local'))) {
  $example = Join-Path $Turismo '.env.local.example'
  if (Test-Path $example) {
    Copy-Item $example (Join-Path $Turismo '.env.local')
    Write-Host 'Created apps/turismo/.env.local' -ForegroundColor Green
  }
}

Write-Host 'Starting Next dev on http://localhost:3005' -ForegroundColor Green
Write-Host 'Login: admin@rsv360.com.br / dev-only-fallback-do-not-use-in-prod' -ForegroundColor Cyan
Set-Location $Turismo
npm run dev
