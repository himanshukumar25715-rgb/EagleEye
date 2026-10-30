@echo off
echo ===================================================
echo Eagle Eye 2.0 - Starting Surveillance Platform
echo ===================================================

echo [1/3] Ensuring Port 8000 is free...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo [2/3] Starting FastAPI Backend on http://localhost:8000 ...
start "Eagle Eye Backend" cmd /k "python run_backend.py"

echo [3/3] Starting React Frontend on http://localhost:5173 ...
start "Eagle Eye Frontend" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo Backend API : http://localhost:8000/docs
echo Frontend UI : http://localhost:5173
echo ===================================================
