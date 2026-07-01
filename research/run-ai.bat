@echo off
setlocal enabledelayedexpansion

:: Nutrican AI — Menu chinh (199-class unified)
set "SCRIPT_DIR=%~dp0"
set "WORKSPACE=%SCRIPT_DIR%.."
cd /d "%WORKSPACE%"

:menu
cls
echo.
echo  ============================================================
echo    NUTRICAN AI — MENU
echo    Model: best_resnet50_unified.h5 (199 class)
echo    Workspace: %CD%
echo  ============================================================
echo.
echo    [1] Cai dat moi truong (venv + dependencies)
echo    [2] Chay AI Service (199 class)
echo    [3] Train unified overnight
echo    [4] Export weights -^> best_resnet50_unified.h5
echo    [5] Kiem tra AI Service (health)
echo    [6] Thoat
echo.
echo  ============================================================
echo.

set /p CHOICE="  Chon [1-6]: "

if "%CHOICE%"=="1" goto :setup
if "%CHOICE%"=="2" goto :service
if "%CHOICE%"=="3" goto :train
if "%CHOICE%"=="4" goto :export
if "%CHOICE%"=="5" goto :check
if "%CHOICE%"=="6" goto :exit

echo [Sai] Vui long chon 1-6.
timeout /t 2 >nul
goto :menu

:setup
cls
echo [1] Cai dat moi truong...
call "%SCRIPT_DIR%run-setup.bat"
goto :done

:service
cls
echo [2] AI Service 199 class...
call "%SCRIPT_DIR%run-ai-service.bat"
goto :done

:train
cls
echo [3] Train unified overnight...
call "%SCRIPT_DIR%run-train-unified-overnight.bat"
goto :done

:export
cls
echo [4] Export deployable model...
"%WORKSPACE%\research\ai-service\.venv\Scripts\python.exe" "%WORKSPACE%\research\scripts\export_resnet_unified.py"
goto :done

:check
cls
echo [5] Kiem tra AI Service...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:8000/health' -UseBasicParsing | Select-Object -ExpandProperty Content } catch { Write-Host '[Loi] Service chua chay.' -ForegroundColor Red }"
echo.
pause
goto :menu

:done
echo.
pause >nul
goto :menu

:exit
exit /b 0
