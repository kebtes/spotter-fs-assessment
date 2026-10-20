# PowerShell helper to launch TruckSafe RouteIQ via Docker Compose
$env:DOCKER_API_VERSION = "1.47"
Write-Host "Starting TruckSafe RouteIQ containers on http://localhost:3001..." -ForegroundColor Cyan
docker compose up
