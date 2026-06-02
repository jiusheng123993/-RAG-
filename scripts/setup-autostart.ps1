$taskName = "LocalProjectMemory"
$scriptPath = Join-Path $PSScriptRoot "start-http-server.ps1"

Write-Host "=== Setting up autostart task ==="
Write-Host "Task name: $taskName"
Write-Host "Script path: $scriptPath"

if (-not (Test-Path $scriptPath)) {
    Write-Host "[ERROR] Script not found at $scriptPath"
    exit 1
}

Write-Host "[INFO] Removing existing task if any..."
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "[INFO] Old task removed"
}

Write-Host "[INFO] Creating new task..."
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "本地项目记忆 MCP HTTP 服务"

Write-Host ""
Write-Host "=== SUCCESS ==="
Write-Host "Task '$taskName' has been created."
Write-Host "Service will start automatically after you log in."
Write-Host ""
Write-Host "To verify, run: Get-ScheduledTask -TaskName '$taskName'"
