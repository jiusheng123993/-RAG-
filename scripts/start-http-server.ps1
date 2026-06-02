$ErrorActionPreference = "Stop"
$env:LOCAL_PROJECT_MEMORY_HOME = "E:\个人本地知识库\.memory-data"
$nodePath = (Get-Command node).Source
$scriptPath = "E:\个人本地知识库\dist\index.js"
$port = 3107

$proc = Start-Process -FilePath $nodePath -ArgumentList "$scriptPath","--http","--port",$port -PassThru -WindowStyle Hidden
Write-Host "HTTP MCP Server started with PID: $($proc.Id)"
