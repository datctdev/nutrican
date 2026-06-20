$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ServiceDir = Join-Path $Root "research\ai-service"
$ModelPath = "d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"

Set-Location $ServiceDir
$env:MODEL_PATH = $ModelPath
$env:PORT = if ($env:AI_RESNET_PORT) { $env:AI_RESNET_PORT } else { "8000" }

Write-Host "Starting Nutrican ResNet50 FastAPI on port $env:PORT ..."
python main.py
