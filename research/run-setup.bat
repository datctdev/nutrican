@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  Nutrican AI — Cai dat moi truong Python cho AI Service
::  Dat o: research\run-setup.bat
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "WORKSPACE=%SCRIPT_DIR%.."
cd /d "%WORKSPACE%"

echo ============================================================
echo  Nutrican AI — Setup Python venv + dependencies
echo  Workspace: %CD%
echo ============================================================

set "PYTHON_VERSION=3.12"

:: Kiem tra Python version
py -3.12 --version >nul 2>&1
if errorlevel 1 (
    echo [WARN] Python 3.12 chua cai. Vui long cai dat Python 3.12:
    echo   py install 3.12
    echo.
    echo Neu may chi co Python 3.14, TensorFlow se KHONG hoat dong.
    pause
    exit /b 1
)

echo [OK] Python 3.12 san sang

:: Tao venv
if not exist "research\ai-service\.venv" (
    echo.
    echo [1/2] Tao virtual environment...
    cd research\ai-service
    py -3.12 -m venv .venv
    if errorlevel 1 (
        echo [LOI] Tao venv that bai.
        cd ..\..
        pause
        exit /b 1
    )
    cd ..\..
) else (
    echo [OK] Virtual environment da ton tai
)

:: Cai requirements
echo.
echo [2/2] Cai dat dependencies (TensorFlow, FastAPI, ...)...
echo    Co the mat 5-15 phut...
echo.

"research\ai-service\.venv\Scripts\pip.exe" install -r research\ai-service\requirements.txt

if errorlevel 1 (
    echo.
    echo [LOI] Cai dat that bai. Thu chay PowerShell voi quyen Admin.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Setup hoan tat!
echo  Bay gio co the chay:
echo    research\run-ai-service.bat   - Chay AI service
echo    research\run-train-phase2.bat - Train model moi
echo ============================================================
pause
