@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  Nutrican AI — Train ResNet50 Phase 2 (com_tam + pho focus)
::  Dat o: research\run-train-phase2.bat
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "WORKSPACE=%SCRIPT_DIR%.."
cd /d "%WORKSPACE%"

:: --- Kiem tra venv ---
set "VENV_PYTHON=research\ai-service\.venv\Scripts\python.exe"
if not exist "%VENV_PYTHON%" (
    echo [LOI] Chua co .venv. Chay truoc:
    echo   research\run-setup.bat
    pause
    exit /b 1
)

:: --- Kiem tra model goc (phase1 lam base) ---
set "BASE_MODEL=research\best_resnet50_model.h5"
if not exist "%BASE_MODEL%" (
    echo [WARN] Khong tim thay %BASE_MODEL% (base model).
    echo   Se chi train tu dau neu co dataset.
    set "BASE_MODEL_ARG="
) else (
    set "BASE_MODEL_ARG=--base-model %BASE_MODEL%"
)

:: --- Dataset: relative to repo root ---
set "DATASET_DEFAULT=research\Vietnamese_Food_Dataset\Vietnamese_Food_Dataset"
if not exist "%DATASET_DEFAULT%" set "DATASET_DEFAULT=research\Vietnamese_Food_Dataset"
if "%~1"=="" (
    if not exist "%DATASET_DEFAULT%" (
        echo [LOI] Khong tim thay dataset.
        echo   Can: %CD%\%DATASET_DEFAULT%
        echo.
        echo Dung: run-train-phase2.bat "D:\duong\dan\dataset"
        echo Hoac copy dataset vao research\Vietnamese_Food_Dataset\
        pause
        exit /b 1
    )
    set "DATASET=%DATASET_DEFAULT%"
) else (
    set "DATASET=%~1"
    if not exist "%DATASET%" (
        echo [LOI] Dataset khong ton tai: %DATASET%
        pause
        exit /b 1
    )
)

:: --- Output ---
set "OUTPUT_MODEL=research\best_resnet50_model_phase2.h5"
set "OUTPUT_REPORT=research\output\resnet50_phase2_report.json"

:: --- Chay training ---
echo.
echo ============================================================
echo  Nutrican AI — Phase 2 ResNet50 Fine-tune
echo  Workspace:   %CD%
echo  Dataset:     %DATASET%
echo  Base model:  %BASE_MODEL%
echo  Output:      %OUTPUT_MODEL%
echo ============================================================
echo.
echo Quy trinh: Stage 1 (head 3 epochs) + Stage 2 (finetune 12 epochs)
echo GPU: Neu co NVIDIA GPU, TensorFlow se tu su dung.
echo.
echo Nut bam Ctrl+C de dung.
echo.
pause

if "%BASE_MODEL%"=="" (
    "%VENV_PYTHON%" research\scripts\train_resnet50_phase2.py --dataset "%DATASET%" --output "%OUTPUT_MODEL%" %*
) else (
    "%VENV_PYTHON%" research\scripts\train_resnet50_phase2.py --dataset "%DATASET%" --base-model "%BASE_MODEL%" --output "%OUTPUT_MODEL%" %*
)

if errorlevel 1 (
    echo.
    echo [LOI] Training that bai.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Training hoan tat!
echo  Model moi: %OUTPUT_MODEL%
echo  Bao cao:  %OUTPUT_REPORT%
echo.
echo  Chay service voi model moi:
echo    research\run-ai-service.bat
echo ============================================================
pause
