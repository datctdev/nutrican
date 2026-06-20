@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  Nutrican AI — Chay ResNet50 FastAPI Service
::  Dat o: research\run-ai-service.bat
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "WORKSPACE=%SCRIPT_DIR%.."
cd /d "%WORKSPACE%"

:: --- Kiem tra venv ---
set "VENV_PYTHON=research\ai-service\.venv\Scripts\python.exe"
if not exist "%VENV_PYTHON%" (
    echo [LOI] Chua co .venv. Chay truoc:
    echo   cd research\ai-service
    echo   py -3.12 -m venv .venv
    echo   .venv\Scripts\pip install -r requirements.txt
    echo.
    echo Hoac dung run-setup.bat de cai dat.
    pause
    exit /b 1
)

:: --- Tim model (Uu tien phase2 > phase1) ---
set "MODEL_DIR=research"
set "MODEL_PATH="

if exist "research\best_resnet50_model_phase2.h5" (
    set "MODEL_PATH=research\best_resnet50_model_phase2.h5"
    echo [INFO] Tim thay model Phase 2
) else if exist "research\best_resnet50_model.h5" (
    set "MODEL_PATH=research\best_resnet50_model.h5"
    echo [INFO] Su dung model Phase 1
) else (
    echo [LOI] Khong tim thay file model nao.
    echo Can: research\best_resnet50_model.h5 hoac research\best_resnet50_model_phase2.h5
    echo.
    echo Neu chua co model, tai tu FPT server hoac chay train Phase 2 truoc.
    pause
    exit /b 1
)

:: --- Port ---
set "PORT=8000"
if not "%AI_RESNET_PORT%"=="" set "PORT=%AI_RESNET_PORT%"

:: --- Chay ---
echo.
echo ============================================================
echo  Nutrican ResNet50 AI Service
echo  Workspace: %CD%
echo  Model:     %MODEL_PATH%
echo  Port:      %PORT%
echo ============================================================
echo.

set "MODEL_PATH=%MODEL_PATH%"
set "PORT=%PORT%"
"%VENV_PYTHON%" research\ai-service\main.py

endlocal
