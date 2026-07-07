# Start Nutrican ResNet50 FastAPI — 199-class unified (default production).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ServiceDir = Join-Path $Root "research\ai-service"
$ModelPath = Join-Path $Root "research\best_resnet50_unified.h5"
$VenvPython = Join-Path $ServiceDir ".venv\Scripts\python.exe"

if (-not (Test-Path $ModelPath)) {
    Write-Error "Model not found: $ModelPath`nExport first: research/scripts/export_resnet_unified.py"
}

Set-Location $Root
$env:RESNET_CLASS_PROFILE = "resnet_unified"
$env:MODEL_PATH = $ModelPath
$env:MODEL_VERSION = "resnet50-unified-vtn-food101"
$env:PORT = if ($env:AI_RESNET_PORT) { $env:AI_RESNET_PORT } else { "8000" }

Write-Host "Starting Nutrican AI (199-class unified) on port $env:PORT ..."
Write-Host "MODEL_PATH=$ModelPath"
Write-Host "RESNET_CLASS_PROFILE=resnet_unified"

if (Test-Path $VenvPython) {
    & $VenvPython (Join-Path $ServiceDir "main.py")
} else {
    Write-Warning 'No .venv — run research/run-setup.bat first'
    py -3.12 (Join-Path $ServiceDir 'main.py')
}
