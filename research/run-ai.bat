@echo off
setlocal enabledelayedexpansion

:: ============================================================
::  Nutrican AI — Menu chinh
::  Dat o: research\run-ai.bat
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "WORKSPACE=%SCRIPT_DIR%.."
cd /d "%WORKSPACE%"

:menu
cls
echo.
echo  ============================================================
echo    NUTRICAN AI — MENU
echo    Workspace: %CD%
echo  ============================================================
echo.
echo    [1] Cai dat moi truong (venv + dependencies)
echo    [2] Chay AI Service (ResNet50 FastAPI — localhost:8000)
echo    [3] Train ResNet50 Phase 2 (com_tam + pho)
echo    [4] Kiem tra AI Service (curl health)
echo    [5] Thoat
echo.
echo  ============================================================
echo.

set /p CHOICE="  Chon [1-5]: "

if "%CHOICE%"=="1" goto :setup
if "%CHOICE%"=="2" goto :service
if "%CHOICE%"=="3" goto :train
if "%CHOICE%"=="4" goto :check
if "%CHOICE%"=="5" goto :exit

echo [Sai] Vui long chon 1-5.
timeout /t 2 >nul
goto :menu

:setup
cls
echo [1] Cai dat moi truong...
call "%SCRIPT_DIR%run-setup.bat"
goto :done

:service
cls
echo [2] Chay AI Service...
call "%SCRIPT_DIR%run-ai-service.bat"
goto :done

:train
cls
echo [3] Train Phase 2...
call "%SCRIPT_DIR%run-train-phase2.bat"
goto :done

:check
cls
echo [4] Kiem tra AI Service...
echo.
echo Dang goi curl http://localhost:8000/health ...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8000/health' -UseBasicParsing | Select-Object -ExpandProperty Content } catch { Write-Host '[Loi] Service chua chay. Vui long chon [2] de khoi dong service truoc.' -ForegroundColor Red }"
echo.
pause
goto :menu

:done
echo.
echo Bam phim bat ky de quay ve menu...
pause >nul
goto :menu

:exit
cls
echo.
echo  Cam on ban da su dung Nutrican AI!
echo.
exit /b 0
