@echo off
REM Quick startup script: Backend + Mobile (Windows Batch)
REM Run from D:\Asset-Manager directory

echo.
echo ===== AutoHire Development Environment Setup =====
echo.

REM Check if repositories exist
if not exist "artifacts\api-server" (
    echo ERROR: artifacts\api-server not found. Run from repo root: D:\Asset-Manager
    pause
    exit /b 1
)

if not exist "artifacts\mobile" (
    echo ERROR: artifacts\mobile not found. Run from repo root: D:\Asset-Manager
    pause
    exit /b 1
)

REM Backend Setup
echo [1/3] Setting up Backend...
cd artifacts\api-server

if not exist ".env" (
    echo Creating .env from .env.example...
    copy ..\.\.env.example .env >nul 2>&1
)

echo Installing backend dependencies...
call pnpm install >nul 2>&1

echo Starting Backend on http://localhost:5000...
REM Open new terminal for backend
start "AutoHire Backend" cmd.exe /k "pnpm dev"

REM Wait for backend to start
timeout /t 3 /nobreak

REM Mobile Setup
echo.
echo [2/3] Setting up Mobile...
cd ..\mobile

echo Creating mobile .env...
echo EXPO_PUBLIC_API_URL=http://localhost:5000 > .env

echo Installing mobile dependencies...
call pnpm install >nul 2>&1

echo.
echo [3/3] Starting Mobile Dev Server...
echo Scan the QR code with Expo Go app
echo.

REM Start mobile dev server
call pnpm expo start --tunnel

REM Keep window open
pause
