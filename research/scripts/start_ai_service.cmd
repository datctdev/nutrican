@echo off
setlocal
cd /d "%~dp0..\ai-service"

set "MODEL_PATH=d:\FPT\SU26\SBA\project_team\research\best_resnet50_model.h5"
if exist "d:\FPT\SU26\SBA\project_team\research\best_resnet50_model_phase2.h5" (
    set "MODEL_PATH=d:\FPT\SU26\SBA\project_team\research\best_resnet50_model_phase2.h5"
    echo [INFO] Using Phase2 fine-tuned model
)
if not "%MODEL_PATH_OVERRIDE%"=="" set "MODEL_PATH=%MODEL_PATH_OVERRIDE%"
if not "%~1"=="" set "MODEL_PATH=%~1"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Missing .venv — run first:
    echo   cd research\ai-service
    echo   py -3.12 -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    exit /b 1
)

if not exist "%MODEL_PATH%" (
    echo [ERROR] Model not found: %MODEL_PATH%
    exit /b 1
)

set "PORT=8000"
if not "%AI_RESNET_PORT%"=="" set "PORT=%AI_RESNET_PORT%"

echo Starting Nutrican ResNet50 FastAPI on port %PORT% ...
echo MODEL_PATH=%MODEL_PATH%
set "MODEL_PATH=%MODEL_PATH%"
set "PORT=%PORT%"
".venv\Scripts\python.exe" main.py
