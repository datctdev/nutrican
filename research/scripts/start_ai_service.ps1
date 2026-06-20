$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ServiceDir = Join-Path $Root "research\ai-service"
$ModelPath = "d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"
$VenvPython = Join-Path $ServiceDir ".venv\Scripts\python.exe"

Set-Location $ServiceDir
$env:MODEL_PATH = $ModelPath
$env:PORT = if ($env:AI_RESNET_PORT) { $env:AI_RESNET_PORT } else { "8000" }

Write-Host "Starting Nutrican ResNet50 FastAPI on port $env:PORT ..."
if (Test-Path $VenvPython) {
    & $VenvPython main.py
} else {
    Write-Warning "No .venv — create first: cd research\ai-service; py -3.12 -m venv .venv; .\.venv\Scripts\pip install -r requirements.txt"
    py -3.12 main.py
}
