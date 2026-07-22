@echo off
title VayuDrishti — Frontend
cd /d "%~dp0frontend"
echo Installing Node dependencies...
npm install
echo.
echo Starting React dev server on http://localhost:5173
echo Press Ctrl+C to stop.
echo.
npm run dev
pause
