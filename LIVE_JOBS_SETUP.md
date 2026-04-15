# Live Jobs Fetching Setup & Debug Guide

## Problem
Jobs are not being fetched from real-time portals (LinkedIn, Indeed, RemoteOk, etc.)

## Root Causes
1. Backend service is not running
2. Mobile app doesn't have the correct backend URL
3. Missing optional API credentials (Adzuna)
4. Network connectivity issues between mobile device and backend

---

## Solution: Step-by-Step Setup

### Step 1: Ensure Backend Environment File Exists

```powershell
Set-Location D:\Asset-Manager\artifacts\api-server

# Create .env from .env.example if it doesn't exist
if (!(Test-Path .env)) {
  Copy-Item ..\..\.env.example .env
  Write-Host ".env created from .env.example. Edit it with your API keys if needed."
}

# View current config
Get-Content .env
```

### Step 2: Start Backend Service (Terminal 1)

```powershell
Set-Location D:\Asset-Manager\artifacts\api-server

# Install dependencies (if not already done)
pnpm install

# Start dev server (watches for changes)
pnpm dev
# Expected output: "Backend running on http://localhost:5000"
# Or check .env for PORT setting
```

**Keep this terminal open.** Backend must be running for mobile to fetch jobs.

### Step 3: Configure Mobile Backend URL (Terminal 2)

```powershell
Set-Location D:\Asset-Manager\artifacts\mobile

# Update .env to point to running backend
$backendUrl = "http://localhost:5000"  # or your public backend URL if deployed
Set-Content -Path .env -Value "EXPO_PUBLIC_API_URL=$backendUrl"

Get-Content .env
# Should show: EXPO_PUBLIC_API_URL=http://localhost:5000
```

If backend is deployed (e.g., on Render), use the public URL instead:
```powershell
$backendUrl = "https://your-backend.render.com"
Set-Content -Path .env -Value "EXPO_PUBLIC_API_URL=$backendUrl"
```

### Step 4: Install & Start Mobile App (Terminal 2)

```powershell
Set-Location D:\Asset-Manager\artifacts\mobile

# Install dependencies
pnpm install

# Start Expo dev server
pnpm expo start --tunnel
# Scan QR code with Expo Go app on your phone
```

### Step 5: Test Job Fetching on Mobile

1. Open the app and navigate to **Jobs** tab
2. Observe:
   - Jobs load from live portals (Remotive, Greenhouse, Arbeitnow, Himalayas, RemoteOk)
   - Each job shows source (verified badge)
   - Pull to refresh updates jobs from portals
3. Filter by location, salary, job type to test

---

## Optional: Add Adzuna API Credentials

Adzuna adds more jobs to the pool (optional but recommended).

1. Sign up free at: https://developer.adzuna.com
2. Get `App ID` and `App Key`
3. Add to `artifacts/api-server/.env`:
   ```
   ADZUNA_APP_ID=your_app_id_here
   ADZUNA_APP_KEY=your_app_key_here
   ```
4. Restart backend: `pnpm dev`

---

## Troubleshooting

### Backend won't start
```powershell
cd D:\Asset-Manager\artifacts\api-server
pnpm install
pnpm build
pnpm dev
# Paste error message from terminal
```

### Mobile app shows "No jobs available"
- Check mobile `.env` has `EXPO_PUBLIC_API_URL` set to running backend
- Verify backend is running (check terminal for "Backend listening on ...")
- Check network: backend and mobile must be on same network
- Try: `curl http://localhost:5000/jobs` from Windows PowerShell

### Jobs load but all fail
- Backend logs show fetch errors? Check if portal APIs are unreachable
- Adzuna credentials empty? (Optional, won't break other sources)
- Try `git status` to verify `.env` files are present and committed

### Mobile can't reach localhost:5000
- If testing on physical device: use your machine's LAN IP instead
  ```powershell
  ipconfig
  # Use IPv4 Address (e.g., 192.168.x.x)
  # Set in mobile .env: EXPO_PUBLIC_API_URL=http://192.168.x.x:5000
  ```
- Or use ngrok for public tunnel (if needed later)

---

## Next: Run Everything

```powershell
# Terminal 1: Start Backend
Set-Location D:\Asset-Manager\artifacts\api-server
pnpm dev

# Terminal 2: Start Mobile
Set-Location D:\Asset-Manager\artifacts\mobile
pnpm expo start --tunnel
```

Scan the QR code with Expo Go → tap Jobs → should see real-time jobs within 5 seconds.

---

## What Happens Under the Hood

1. Mobile: User taps Jobs tab
2. Mobile: Calls backend `GET /jobs?q=...&location=...`
3. Backend: Fetches in parallel from:
   - Greenhouse (80+ boards)
   - Adzuna (if credentials set)
   - Remotive
   - Arbeitnow
   - Himalayas
   - RemoteOk
4. Backend: Deduplicates, filters for India, caches (5 min TTL)
5. Backend: Returns 50-100 jobs to mobile
6. Mobile: Displays with source badge and apply button

---

## Support

Paste here if you hit issues:
- Backend startup error
- Mobile network error (404, 500, timeout)
- Jobs list empty after both services running
