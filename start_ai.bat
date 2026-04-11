@echo off
title Smart_CSM AI Backend
echo ==========================================
echo Starting Smart_CSM Local AI Backend...
echo ==========================================
cd /d "%~dp0server_ai"
if not exist "venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found in server_ai\venv
    pause
    exit /b
)
echo [SYSTEM] Starting FastAPI Server on http://localhost:8000
".\venv\Scripts\python.exe" main.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Server failed with code %ERRORLEVEL%
    pause
)
pause
