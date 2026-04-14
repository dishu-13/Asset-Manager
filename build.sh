#!/bin/bash
# AutoHire AI - Build & Deployment Script
# This script helps build and deploy the application

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}AutoHire AI - Build & Deploy${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Check if command is provided
if [ -z "$1" ]; then
    echo "Usage: ./build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  install       - Install all dependencies"
    echo "  build-web     - Build web version for Vercel"
    echo "  build-apk     - Build APK for Android"
    echo "  dev-backend   - Start backend dev server"
    echo "  dev-frontend  - Start frontend dev server"
    echo "  test          - Run tests"
    echo "  deploy        - Deploy to production"
    echo "  clean         - Clean build files"
    exit 1
fi

COMMAND=$1

case $COMMAND in
    install)
        echo -e "${BLUE}Installing dependencies...${NC}"
        pnpm install
        echo -e "${GREEN}✓ Dependencies installed${NC}"
        ;;
    
    build-web)
        echo -e "${BLUE}Building web application...${NC}"
        cd artifacts/mobile
        pnpm build:web
        echo -e "${GREEN}✓ Web build complete. Output in: artifacts/mobile/dist${NC}"
        ;;
    
    build-apk)
        echo -e "${BLUE}Building Android APK...${NC}"
        echo -e "${YELLOW}Make sure you have EAS CLI installed: npm install -g eas-cli${NC}"
        cd artifacts/mobile
        eas build --platform android --profile production
        echo -e "${GREEN}✓ APK build started. Check EAS dashboard for download link.${NC}"
        ;;
    
    build-backend)
        echo -e "${BLUE}Building backend...${NC}"
        cd artifacts/api-server
        pnpm build
        echo -e "${GREEN}✓ Backend build complete.${NC}"
        ;;
    
    dev-backend)
        echo -e "${BLUE}Starting backend dev server...${NC}"
        cd artifacts/api-server
        pnpm dev
        ;;
    
    dev-frontend)
        echo -e "${BLUE}Starting frontend dev server...${NC}"
        cd artifacts/mobile
        pnpm dev
        ;;
    
    dev)
        echo -e "${BLUE}Starting both servers...${NC}"
        echo -e "${YELLOW}Run this script in two separate terminals:${NC}"
        echo -e "  Terminal 1: ./build.sh dev-backend"
        echo -e "  Terminal 2: ./build.sh dev-frontend"
        ;;
    
    test)
        echo -e "${BLUE}Running tests...${NC}"
        pnpm test
        echo -e "${GREEN}✓ Tests complete${NC}"
        ;;
    
    deploy)
        echo -e "${BLUE}Deploying to production...${NC}"
        echo -e "${YELLOW}Steps:${NC}"
        echo "  1. Backend will be deployed to Render (auto on git push if connected)"
        echo "  2. Frontend will be deployed to Vercel (auto on git push if connected)"
        echo "  3. APK can be built using: ./build.sh build-apk"
        echo ""
        echo "Make sure your .env contains:"
        echo "  - EXPO_PUBLIC_API_URL (Render backend URL)"
        echo "  - EXPO_PUBLIC_SUPABASE_URL"
        echo "  - EXPO_PUBLIC_SUPABASE_ANON_KEY"
        echo ""
        echo -e "${BLUE}Check DEPLOYMENT_GUIDE.md for detailed instructions${NC}"
        ;;
    
    clean)
        echo -e "${BLUE}Cleaning build files...${NC}"
        rm -rf artifacts/mobile/dist artifacts/mobile/.next
        rm -rf artifacts/api-server/dist artifacts/api-server/build
        rm -rf node_modules artifacts/*/node_modules
        pnpm store prune
        echo -e "${GREEN}✓ Clean complete${NC}"
        ;;
    
    status)
        echo -e "${BLUE}Project Status${NC}"
        echo "  Backend: $([ -d 'artifacts/api-server/dist' ] && echo 'Built ✓' || echo 'Not built')"
        echo "  Frontend: $([ -d 'artifacts/mobile/dist' ] && echo 'Built ✓' || echo 'Not built')"
        echo "  Dependencies: $([ -d 'node_modules' ] && echo 'Installed ✓' || echo 'Not installed')"
        ;;
    
    *)
        echo -e "${RED}Unknown command: $COMMAND${NC}"
        exit 1
        ;;
esac
