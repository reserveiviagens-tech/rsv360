# RSV360 — sobe stack dev Docker (postgres, redis, backend, turismo) para agendador / logon.
# Saída registrada em docs/evidence/local/RSV360-DEV-DOCKER-SCHEDULER.log
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$LogDir = Join-Path $Root 'docs\evidence\local'
$LogFile = Join-Path $LogDir 'RSV360-DEV-DOCKER-SCHEDULER.log'

if (-not (Test-Path $LogDir)) {
  New-Item -ItemType Directory -Path $LogDir -Force | Out-Null
}

function Write-Log([string]$msg) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

try {
  Write-Log 'START docker-up-dev-full'
  Set-Location $Root

  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Log 'FAIL docker CLI not found'
    exit 1
  }

  docker compose version 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Log "FAIL docker compose exit=$LASTEXITCODE"
    exit $LASTEXITCODE
  }

  docker compose up -d postgres redis backend turismo 2>&1 | ForEach-Object { Write-Log $_ }
  if ($LASTEXITCODE -ne 0) {
    Write-Log "FAIL docker compose up exit=$LASTEXITCODE"
    exit $LASTEXITCODE
  }

  Write-Log 'END OK'
  exit 0
} catch {
  Write-Log "FAIL $($_.Exception.Message)"
  exit 1
}