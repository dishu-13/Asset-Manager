# AutoHire AI - Build & Deployment Script (Windows/PowerShell)
# This script helps build and deploy the application

param(
    [Parameter(Mandatory=$false)]
    [string]$Command = ""
)

# Colors
$Green = "Green"
$Blue = "Cyan"
$Yellow = "Yellow"
$Red = "Red"

Write-Host "========================================" -ForegroundColor $Blue
Write-Host "AutoHire AI - Build & Deploy" -ForegroundColor $Blue
Write-Host "========================================`n" -ForegroundColor $Blue

if ([string]::IsNullOrEmpty($Command)) {
    Write-Host "Usage: ./build.ps1 -Command <command>" -ForegroundColor $Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor $Blue
    Write-Host "  install       - Install all dependencies"
    Write-Host "  build-web     - Build web version for Vercel"
    Write-Host "  build-apk     - Build APK for Android"
    Write-Host "  dev-backend   - Start backend dev server"
    Write-Host "  dev-frontend  - Start frontend dev server"
    Write-Host "  test          - Run tests"
    Write-Host "  deploy        - Deploy to production"
    Write-Host "  clean         - Clean build files"
    exit 1
}

switch ($Command) {
    "install" {
        Write-Host "Installing dependencies..." -ForegroundColor $Blue
        pnpm install
        Write-Host "✓ Dependencies installed" -ForegroundColor $Green
    }
    
    "build-web" {
        Write-Host "Building web application..." -ForegroundColor $Blue
        Set-Location artifacts/mobile
        pnpm build:web
        Set-Location ../..
        Write-Host "✓ Web build complete. Output in: artifacts/mobile/dist" -ForegroundColor $Green
    }
    
    "build-apk" {
        Write-Host "Building Android APK..." -ForegroundColor $Blue
        Write-Host "Make sure you have EAS CLI installed: npm install -g eas-cli" -ForegroundColor $Yellow
        Set-Location artifacts/mobile
        eas build --platform android --profile production
        Set-Location ../..
        Write-Host "✓ APK build started. Check EAS dashboard for download link." -ForegroundColor $Green
    }
    
    "build-backend" {
        Write-Host "Building backend..." -ForegroundColor $Blue
        Set-Location artifacts/api-server
        pnpm build
        Set-Location ../..
        Write-Host "✓ Backend build complete." -ForegroundColor $Green
    }
    
    "dev-backend" {
        Write-Host "Starting backend dev server..." -ForegroundColor $Blue
        Set-Location artifacts/api-server
        pnpm dev
    }
    
    "dev-frontend" {
        Write-Host "Starting frontend dev server..." -ForegroundColor $Blue
        Set-Location artifacts/mobile
        pnpm dev
    }
    
    "dev" {
        Write-Host "Starting both servers..." -ForegroundColor $Blue
        Write-Host "Run this script in two separate terminals:" -ForegroundColor $Yellow
        Write-Host "  PowerShell 1: ./build.ps1 -Command dev-backend"
        Write-Host "  PowerShell 2: ./build.ps1 -Command dev-frontend"
    }
    
    "test" {
        Write-Host "Running tests..." -ForegroundColor $Blue
        pnpm test
        Write-Host "✓ Tests complete" -ForegroundColor $Green
    }
    
    "deploy" {
        Write-Host "Deploying to production..." -ForegroundColor $Blue
        Write-Host "Steps:" -ForegroundColor $Yellow
        Write-Host "  1. Backend will be deployed to Render (auto on git push if connected)"
        Write-Host "  2. Frontend will be deployed to Vercel (auto on git push if connected)"
        Write-Host "  3. APK can be built using: ./build.ps1 -Command build-apk"
        Write-Host ""
        Write-Host "Make sure your .env contains:"
        Write-Host "  - EXPO_PUBLIC_API_URL (Render backend URL)"
        Write-Host "  - EXPO_PUBLIC_SUPABASE_URL"
        Write-Host "  - EXPO_PUBLIC_SUPABASE_ANON_KEY"
        Write-Host ""
        Write-Host "Check DEPLOYMENT_GUIDE.md for detailed instructions" -ForegroundColor $Blue
    }
    
    "clean" {
        Write-Host "Cleaning build files..." -ForegroundColor $Blue
        Remove-Item -Recurse -Force artifacts/mobile/dist -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force artifacts/mobile/.next -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force artifacts/api-server/dist -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force artifacts/api-server/build -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        Remove-Item -Recurse -Force artifacts/*/node_modules -ErrorAction SilentlyContinue
        pnpm store prune
        Write-Host "✓ Clean complete" -ForegroundColor $Green
    }
    
    "status" {
        Write-Host "Project Status" -ForegroundColor $Blue
        $backendBuilt = (Test-Path "artifacts/api-server/dist") -and "Built ✓" -or "Not built"
        $frontendBuilt = (Test-Path "artifacts/mobile/dist") -and "Built ✓" -or "Not built"
        $depsInstalled = (Test-Path "node_modules") -and "Installed ✓" -or "Not installed"
        
        Write-Host "  Backend: $backendBuilt"
        Write-Host "  Frontend: $frontendBuilt"
        Write-Host "  Dependencies: $depsInstalled"
    }
    
    default {
        Write-Host "Unknown command: $Command" -ForegroundColor $Red
        exit 1
    }
}
