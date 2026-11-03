@echo off
title Sri Sakthi Xerox - Shop Manager
echo Starting Sri Sakthi Xerox Local Server...

:: Check if virtualenv exists
if exist venv\Scripts\python.exe (
    set PYTHON_EXEC=venv\Scripts\python.exe
) else (
    set PYTHON_EXEC=python
)

:: Launch browser after 2 seconds in background
start "" timeout /t 2 /nobreak >nul & start http://127.0.0.1:5000

:: Start Flask server
%PYTHON_EXEC% app.py
pause
