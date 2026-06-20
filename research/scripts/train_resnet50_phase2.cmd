@echo off
setlocal
cd /d "%~dp0.."

set "VENV=ai-service\.venv\Scripts\python.exe"
if not exist "%VENV%" (
    echo [ERROR] Run first: cd research\ai-service ^& py -3.12 -m venv .venv ^& .venv\Scripts\pip install -r requirements.txt
    exit /b 1
)

echo === Phase 2 ResNet50 fine-tune (com_tam + pho focus) ===
echo Workspace: %CD%
echo Dataset:   ..\Vietnamese_Food_Dataset\Vietnamese_Food_Dataset
echo Output:    research\best_resnet50_model_phase2.h5
echo.
echo Quick smoke: add --quick
echo Full train:  default 3+12 epochs (~30-90 min GPU / longer on CPU)
echo Dataset tuy chinh: run-train-phase2.bat "D:\path\to\dataset"
echo.

"%VENV%" scripts\train_resnet50_phase2.py %*

if %ERRORLEVEL% equ 0 (
    echo.
    echo To use the new model:
    echo   research\run-ai-service.bat
)
