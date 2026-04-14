# AutoHire AI - Deployment Guide

## Overview
This guide provides step-by-step instructions to deploy AutoHire AI to production using Vercel (frontend), Render (backend), and build production APK.

---

## Prerequisites
- Node.js 20+ and pnpm package manager
- Git account and GitHub repository
- Vercel account (free)
- Render account (free tier available)
- Supabase account (for OAuth authentication)
- EAS Build account (for APK/iOS builds)

---

## 1. Environment Setup

### Create `.env` file in project root:
```bash
# Copy from example
cp .env.example .env

# Edit with your values
EXPO_PUBLIC_API_URL=https://autohire-api.onrender.com (after Render deployment)
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
```

### For Backend Services:
```bash
ADZUNA_APP_ID=get_from_adzuna_api
ADZUNA_APP_KEY=get_from_adzuna_api
```

---

## 2. Perform Local Build Test

### Install Dependencies:
```bash
pnpm install
```

### Test Backend:
```bash
cd artifacts/api-server
pnpm build
pnpm start
# Should run on http://localhost:3001
```

### Test Frontend Web Build:
```bash
cd artifacts/mobile
pnpm build:web
pnpm serve
# Should run on http://localhost:8000
```

### Verify API Connection:
```bash
curl http://localhost:3001/api/health
# Should return: { "ok": true, "version": "1.0.0" }
```

---

## 3. Deploy Backend to Render

### Steps:
1. Push code to GitHub
2. Go to https://render.com
3. Create new Web Service
4. Connect GitHub repository
5. Configure:
   - **Name**: autohire-api
   - **Environment**: Node
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `cd artifacts/api-server && pnpm start`
   - **Publish Directory**: (leave blank)

6. Set Environment Variables:
   ```
   NODE_ENV=production
   LOG_LEVEL=info
   ADZUNA_APP_ID=<your-key>
   ADZUNA_APP_KEY=<your-key>
   ```

7. Click "Deploy"

4. Once deployed, copy your Render URL (e.g., `https://autohire-api.onrender.com`)

---

## 4. Deploy Frontend to Vercel

### Steps:
1. Go to https://vercel.com
2. Import project from GitHub
3. Configure:
   - **Framework Preset**: Other
   - **Root Directory**: `artifacts/mobile`
   - **Build Command**: `pnpm build:web`
   - **Output Directory**: `dist`

4. Set Environment Variables:
   ```
   EXPO_PUBLIC_API_URL=https://autohire-api.onrender.com
   EXPO_PUBLIC_SUPABASE_URL=<your-supabase-url>
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-key>
   ```

5. Click "Deploy"

6. Your frontend will be live at `https://autohire-xxxx.vercel.app`

---

## 5. Build Production APK

### Setup EAS (Expo Application Services):
```bash
npm install -g eas-cli
eas login
```

### Create `eas.json` in project root:
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccount": "~/.eas/service-account-key.json"
      }
    }
  }
}
```

### Build APK:
```bash
cd artifacts/mobile
eas build --platform android --profile production
```

This will output a direct APK download link.

---

## 6. Manual Android Build (Alternative)

If EAS is not available:

```bash
cd artifacts/mobile

# Generate build files
npm run android

# Or use Gradle directly
cd android
./gradlew assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

---

## 7. Post-Deployment Checklist

- [ ] Backend API is responding at `/api/health`
- [ ] Frontend loads and connects to backend
- [ ] Jobs list populates correctly
- [ ] Authentication works (login/signup)
- [ ] OAuth buttons appear (if keys configured)
- [ ] Dark mode toggle works
- [ ] Responsive design works on mobile
- [ ] APK installs and runs on Android device

---

## 8. Troubleshooting

### Backend not starting:
```bash
# Check for port conflicts
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows
```

### API CORS errors:
- Ensure `CORS` is enabled in backend (`app.ts`)
- Verify `EXPO_PUBLIC_API_URL` matches deployed backend URL

### OAuth not working:
- Check Supabase credentials
- Verify redirect URL matches callback handler
- Check browser console for OAuth errors

### APK won't install:
- Ensure minimum Android version is set correctly
- Check device storage space
- Try `adb install -r app-release.apk`

---

## 9. Monitoring & Logs

### Render:
- View logs: Dashboard > Service > Logs

### Vercel:
- View logs: Dashboard > Deployments > Logs

### Local:
```bash
# Backend logs
cd artifacts/api-server && pnpm dev

# Frontend logs (check browser console)
cd artifacts/mobile && pnpm dev
```

---

## 10. Updates & Maintenance

To push updates:

1. Commit and push to GitHub
2. Vercel and Render auto-deploy on push (if connected)
3. For new APK: `eas build --platform android --profile production`

---

## Support & Next Steps

- Documentation: See README.md
- Issues: Report on GitHub Issues
- Feature Requests: GitHub Discussions
