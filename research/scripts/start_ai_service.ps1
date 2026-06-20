$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ServiceDir = Join-Path $Root "research\ai-service"
$ModelDir = Join-Path $Root "research"
if (Test-Path (Join-Path $ModelDir "best_resnet50_model_phase2.h5")) {
    $ModelPath = Join-Path $ModelDir "best_resnet50_model_phase2.h5"
} else {
    $ModelPath = Join-Path $ModelDir "best_resnet50_model.h5"
}
$VenvPython = Join-Path $ServiceDir ".venv\Scripts\python.exe"

Set-Location $Root
$env:MODEL_PATH = $ModelPath
$env:PORT = if ($env:AI_RESNET_PORT) { $env:AI_RESNET_PORT } else { "8000" }

Write-Host "Starting Nutrican ResNet50 FastAPI on port $env:PORT ..."
Write-Host "Model: $ModelPath"
if (Test-Path $VenvPython) {
    & $VenvPython (Join-Path $ServiceDir "main.py")
} else {
    Write-Warning "No .venv — create first: cd research\ai-service; py -3.12 -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt"
    py -3.12 (Join-Path $ServiceDir "main.py")
}
