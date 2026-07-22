@echo off
title VayuDrishti — Backend
cd /d "%~dp0backend"
echo Installing Python dependencies...
pip install -r requirements.txt
echo.
echo Starting FastAPI on http://localhost:8000
echo Press Ctrl+C to stop.
echo.
uvicorn main:app --reload --port 8000
pause
