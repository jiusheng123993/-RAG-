# Fix PostgreSQL pg_hba.conf - Replace scram-sha-256 with trust
$pgHbaPath = "D:\PostgreSQL date\pg_hba.conf"
$backupPath = "D:\PostgreSQL date\pg_hba.conf.bak"

# Backup original file
Copy-Item -Path $pgHbaPath -Destination $backupPath -Force
Write-Host "Backup created: $backupPath"

# Read content
$content = Get-Content -Path $pgHbaPath -Raw

# Replace scram-sha-256 with trust
$content = $content -replace 'scram-sha-256', 'trust'

# Write back
Set-Content -Path $pgHbaPath -Value $content -Encoding ASCII
Write-Host "pg_hba.conf updated: scram-sha-256 -> trust"

# Show the changed lines
Write-Host "`nChanged lines:"
Get-Content -Path $pgHbaPath | Where-Object { $_ -match 'trust' -and $_ -notmatch '^#' -and $_.Trim() -ne '' }

Write-Host "`nDone! Now restart PostgreSQL service:"
Write-Host "  net stop postgresql-x64-18"
Write-Host "  net start postgresql-x64-18"
