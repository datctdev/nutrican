@echo off
cd /d "%~dp0.."
powershell -NoProfile -ExecutionPolicy Bypass -File "research\scripts\run_train_unified_overnight.ps1"
pause
