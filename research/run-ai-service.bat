@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "research\scripts\start_ai_service.ps1"
pause
