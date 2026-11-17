# Registra ou atualiza a tarefa \RSV360 Dev Docker (execute PowerShell como usuário com permissão).
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Script = Join-Path $Root 'scripts\docker-up-dev-full.ps1'
$TaskName = 'RSV360 Dev Docker'

if (-not (Test-Path $Script)) {
  throw "Script ausente: $Script"
}

$Action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$Script`""

$Trigger = @(
  (New-ScheduledTaskTrigger -AtLogOn),
  (New-ScheduledTaskTrigger -Daily -At '08:00')
)

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
$Desc = 'Sobe postgres/redis/backend/turismo via docker compose'
if ($existing) {
  Set-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings | Out-Null
  Write-Host "OK: tarefa '$TaskName' atualizada."
} else {
  Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description $Desc | Out-Null
  Write-Host "OK: tarefa '$TaskName' criada."
}

Get-ScheduledTask -TaskName $TaskName | Format-List TaskName, State
Get-ScheduledTaskInfo -TaskName $TaskName | Format-List LastRunTime, LastTaskResult, NextRunTime