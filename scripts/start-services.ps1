# =============================================================================
# Hotel Federation - Local Services Starter (PostgreSQL + Redis)
# =============================================================================

Write-Host "Checking Redis Server..." -ForegroundColor Cyan
$redisRunning = Get-Process -Name "redis-server" -ErrorAction SilentlyContinue
if (-not $redisRunning) {
    $redisPath = "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\taizod1024.redis-windows-fork_Microsoft.Winget.Source_8wekyb3d8bbwe\redis-server.exe"
    if (Test-Path $redisPath) {
        Start-Process $redisPath -ArgumentList "--port 6379" -WindowStyle Hidden
        Write-Host "Redis server started on port 6379." -ForegroundColor Green
    } else {
        Write-Host "Redis binary not found in WinGet path. Please check your Redis install." -ForegroundColor Yellow
    }
} else {
    Write-Host "Redis server is already running." -ForegroundColor Green
}

Write-Host "Checking PostgreSQL Cluster (Port 5433)..." -ForegroundColor Cyan
$pgData = "$env:USERPROFILE\.postgres_hfr_data"
$pgCtl = "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe"
$pgRunning = Get-Process -Name "postgres" -ErrorAction SilentlyContinue | Where-Object {
    (Get-NetTCPConnection -LocalPort 5433 -OwningProcess $_.Id -ErrorAction SilentlyContinue)
}

if (-not $pgRunning -and (Test-Path $pgData)) {
    & $pgCtl -D $pgData -l "$pgData\server.log" start
    Write-Host "PostgreSQL cluster started on port 5433." -ForegroundColor Green
} else {
    Write-Host "PostgreSQL cluster is already running on port 5433." -ForegroundColor Green
}

Write-Host "`nAll development services are verified and operational!" -ForegroundColor Green

