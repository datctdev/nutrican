@echo off
setlocal
cd /d "%~dp0..\.."

set "MODEL_PATH=research\best_resnet50_model.h5"
if exist "research\best_resnet50_model_phase2.h5" (
    set "MODEL_PATH=research\best_resnet50_model_phase2.h5"
    echo [INFO] Using Phase2 fine-tuned model
)
if not "%MODEL_PATH_OVERRIDE%"=="" set "MODEL_PATH=%MODEL_PATH_OVERRIDE%"
if not "%~1"=="" set "MODEL_PATH=%~1"

if not exist "research\ai-service\.venv\Scripts\python.exe" (
    echo [ERROR] Missing .venv — run first:
    echo   research\run-setup.bat
    exit /b 1
)

if not exist "%MODEL_PATH%" (
    echo [ERROR] Model not found: %MODEL_PATH%
    echo Place best_resnet50_model_phase2.h5 in research\
    exit /b 1
)

set "PORT=8000"
if not "%AI_RESNET_PORT%"=="" set "PORT=%AI_RESNET_PORT%"

echo Starting Nutrican ResNet50 FastAPI on port %PORT% ...
echo Workspace: %CD%
echo MODEL_PATH=%MODEL_PATH%
set "MODEL_PATH=%MODEL_PATH%"
set "PORT=%PORT%"
"research\ai-service\.venv\Scripts\python.exe" research\ai-service\main.py
