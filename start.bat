@echo off
echo ========================================================
echo Starting CodeLens AI (All-in-One Server)
echo ========================================================

cd /d "%~dp0frontend"
if not exist "dist" (
    echo Building frontend production assets...
    call npm run build
)

cd /d "%~dp0backend"
echo Launching server at http://localhost:8000 ...
start http://localhost:8000
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
