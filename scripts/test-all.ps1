# Run full NutriCan test pyramid (BE unit+integration → FE build → Playwright E2E)
param(
    [ValidateSet('all', 'be', 'fe', 'e2e')]
    [string]$Layer = 'all',
    [switch]$SkipDocker,
    [switch]$SkipE2E,
    [switch]$SkipFeBuild
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$apiBase = if ($env:E2E_API_URL) { $env:E2E_API_URL } else { "http://localhost:8080/api/v1" }

function Wait-ForBackend {
    param([int]$MaxAttempts = 30, [int]$DelaySeconds = 2)
    Write-Host "[E2E] Waiting for backend at $apiBase ..." -ForegroundColor Yellow
    $body = '{"email":"customer1@gmail.com","password":"123456"}'
    for ($i = 1; $i -le $MaxAttempts; $i++) {
        try {
            $res = Invoke-WebRequest -Uri "$apiBase/auth/login" -Method POST `
                -ContentType "application/json" -Body $body -UseBasicParsing -TimeoutSec 5
            if ($res.StatusCode -eq 200) {
                Write-Host "[E2E] Backend ready (attempt $i)" -ForegroundColor Green
                return
            }
        } catch {
            # retry until seed users are available
        }
        Start-Sleep -Seconds $DelaySeconds
    }
    throw "Backend not reachable at $apiBase after $($MaxAttempts * $DelaySeconds)s. Start: cd nutrican-be; docker compose up -d; ./mvnw spring-boot:run"
}

Write-Host "=== NutriCan test-all (Layer=$Layer) ===" -ForegroundColor Cyan

$runBe = $Layer -eq 'all' -or $Layer -eq 'be'
$runFe = $Layer -eq 'all' -or $Layer -eq 'fe'
$runE2e = ($Layer -eq 'all' -or $Layer -eq 'e2e') -and -not $SkipE2E

if ($runBe -and -not $SkipDocker) {
    Write-Host "[1] Docker compose up..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "nutrican-be")
    docker compose up -d
    Pop-Location
} elseif ($runBe) {
    Write-Host "[1] Skipping Docker" -ForegroundColor DarkGray
}

if ($runBe) {
    Write-Host "[BE] Backend tests (mvnw test)..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "nutrican-be")
    .\mvnw test -q
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
    Pop-Location
}

if ($runFe -and -not $SkipFeBuild) {
    Write-Host "[FE] Frontend build..." -ForegroundColor Yellow
    Push-Location (Join-Path $root "nutrican-fe")
    npm run build
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
    Pop-Location
} elseif ($runFe) {
    Write-Host "[FE] Skipping FE build" -ForegroundColor DarkGray
}

if ($runE2e) {
    Wait-ForBackend
    Write-Host "[E2E] Playwright: full 22 specs (includes v3.1 BE/FE/Hybrid blocks)" -ForegroundColor Yellow
    Push-Location (Join-Path $root "e2e")
    if (-not (Test-Path "node_modules")) { npm install }
    if (-not (Test-Path "node_modules/@playwright/test")) { & npx playwright install chromium }
    Remove-Item Env:E2E_SKIP_WEBSERVER -ErrorAction SilentlyContinue

    & npx playwright test tests/
    if ($LASTEXITCODE -ne 0) { Pop-Location; exit $LASTEXITCODE }
    Pop-Location
} elseif ($Layer -eq 'e2e' -or (-not $SkipE2E -and $Layer -eq 'all')) {
    Write-Host "[E2E] Skipping Playwright" -ForegroundColor DarkGray
}

Write-Host "=== All requested stages passed (Layer=$Layer) ===" -ForegroundColor Green
