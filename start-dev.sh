#!/bin/bash
# Quick startup script: Backend + Mobile (macOS/Linux)
# Run from repository root: D:\Asset-Manager

echo ""
echo "===== AutoHire Development Environment Setup ====="
echo ""

# Check if repositories exist
if [ ! -d "artifacts/api-server" ]; then
    echo "ERROR: artifacts/api-server not found. Run from repo root."
    exit 1
fi

if [ ! -d "artifacts/mobile" ]; then
    echo "ERROR: artifacts/mobile not found. Run from repo root."
    exit 1
fi

# Backend Setup
echo "[1/3] Setting up Backend..."
cd artifacts/api-server

if [ ! -f ".env" ]; then
    echo "Creating .env from .env.example..."
    cp ../../.env.example .env
fi

echo "Installing backend dependencies..."
pnpm install > /dev/null 2>&1

echo "Starting Backend on http://localhost:5000..."
pnpm dev &
BACKEND_PID=$!

sleep 3

# Mobile Setup
echo ""
echo "[2/3] Setting up Mobile..."
cd ../mobile

echo "Creating mobile .env..."
echo "EXPO_PUBLIC_API_URL=http://localhost:5000" > .env

echo "Installing mobile dependencies..."
pnpm install > /dev/null 2>&1

echo ""
echo "[3/3] Starting Mobile Dev Server..."
echo "Scan the QR code with Expo Go app"
echo ""

# Start mobile dev server
pnpm expo start --tunnel

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT
