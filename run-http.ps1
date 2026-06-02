$env:LOCAL_PROJECT_MEMORY_HOME = "E:\个人本地知识库\.memory-data"
$outFile = "E:\个人本地知识库\server.log"
$errFile = "E:\个人本地知识库\server.err"
$proc = Start-Process -FilePath "node" -ArgumentList "dist/index.js","--http","--port","3107" -PassThru -WindowStyle Hidden -RedirectStandardOutput $outFile -RedirectStandardError $errFile
Write-Host "HTTP MCP Server started with PID: $($proc.Id)"
Start-Sleep -Seconds 3
if ($proc.HasExited) {
    Write-Host "Server exited with code: $($proc.ExitCode)"
    if (Test-Path $errFile) { Get-Content $errFile | Select-Object -First 10 }
} else {
    Write-Host "Server is running"
}
