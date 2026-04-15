# AutoHire Live Jobs - System Status & Next Steps

## ✅ Services Running (April 15, 2026)

### Backend API Server
- **Status:** ✅ Active & Listening
- **Port:** 5000
- **URL:** http://localhost:5000
- **Features:** Real-time job aggregation from 6+ portals
  - ✅ Remotive (remote jobs)
  - ✅ Greenhouse (80+ company boards)
  - ✅ Arbeitnow (global jobs)
  - ✅ Himalayas (startup & remote)
  - ✅ RemoteOk (verified remote)
  - ✅ Adzuna (optional, with API keys)
  - ✅ India Platform Jobs (structured, fallback)

### Mobile App Dev Server
- **Status:** ✅ Metro Bundler Running
- **Port:** 8081
- **Connection:** exp://127.0.0.1:8081
- **QR Code:** Available in PowerShell terminal (scan with Expo Go)

---

## 📱 View Live Jobs on Your Phone

### Option 1: Physical Android Device
1. **Install Expo Go** from Google Play Store
2. **Enable USB Debugging** on your phone (Settings → Developer options)
3. **Connect phone via USB** to your Windows machine
4. **Scan the QR code** from the PowerShell terminal with Expo Go, OR:
   - Open Expo Go → Scan code → point camera at terminal screen

### Option 2: Android Emulator
1. **Open Android Studio** and launch an emulator
2. **Install Expo Go** in the emulator (or use pre-installed Expo CLI)
3. **Scan the QR code** displayed in the terminal

### Option 3: iOS Device
1. **Install Expo Go** from Apple App Store
2. **Open Camera app** on iPhone
3. **Point camera at the QR code** shown in the terminal
4. **Tap the notification** to open in Expo Go

---

## 🎯 What You'll See

### Jobs Tab Features
- **Real-time Job Listings:** Fresh jobs from 6+ sources updated every 5 minutes
- **Source Badges:** See which portal each job came from (Remotive, Greenhouse, etc.)
- **India-Filtered:** All jobs relevant to India (location or remote + India)
- **Search & Filter:**
  - By keyword, location, job type, salary range, experience level
  - Pull-to-refresh for latest jobs
- **Apply Directly:** Tap "View & Apply" → redirects to original portal

### Job Details
- **ATS Score:** Shows resume match percentage (if you uploaded one)
- **Tailored Resume** option for selected job
- **Recommendations:** AI-suggested jobs based on your resume

---

## 🔧 If Jobs Don't Appear

### Check Backend is Running
```powershell
# In PowerShell, verify backend terminal shows:
# [HH:MM:SS.mmm] INFO (pid): Server listening
#     port: 5000

# Or test with:
curl http://localhost:5000/jobs
```

### Check Mobile Backend URL
```powershell
# Verify .env file exists:
Test-Path D:\Asset-Manager\artifacts\mobile\.env

# And contains:
Get-Content D:\Asset-Manager\artifacts\mobile\.env
# Should show: EXPO_PUBLIC_API_URL=http://localhost:5000
```

### Network Issues (Physical Device)
If your phone can't reach localhost:5000:
1. Get your Windows machine's IP:
   ```powershell
   ipconfig /all
   # Note IPv4 Address (e.g., 192.168.1.100)
   ```
2. Update mobile `.env`:
   ```powershell
   $ip = "192.168.1.100"  # Replace with your IP
   Set-Content -Path D:\Asset-Manager\artifacts\mobile\.env -Value "EXPO_PUBLIC_API_URL=http://$ip:5000"
   ```
3. Restart Expo dev server (Ctrl+C, then run `pnpm expo start --localhost` again)

---

## 📡 Optional: Add Adzuna API (More Jobs)

Adzuna adds 50+ additional India jobs to the pool.

1. Sign up free at: https://developer.adzuna.com
2. Get `App ID` and `App Key`
3. Create `D:\Asset-Manager\artifacts\api-server\.env`:
   ```
   ADZUNA_APP_ID=your_app_id
   ADZUNA_APP_KEY=your_app_key
   ```
4. Restart backend (Ctrl+C in backend terminal, then re-run start command)

---

## 🚀 Currently Running Terminals

### Terminal 1: Backend API
```
$env:PORT=5000; node --enable-source-maps D:\Asset-Manager\artifacts\api-server\dist\index.mjs
```
**Do NOT close this terminal — keep running for live jobs**

### Terminal 2: Mobile Dev Server
```
cd D:\Asset-Manager\artifacts\mobile; pnpm exec expo start --localhost
```
**Do NOT close this terminal — keep running for app access**

---

## ⏸️ How to Stop Services

When done testing:

### Stop Browser (Web App)
- Press `Ctrl+C` in the Metro Bundler terminal (Terminal 2)

### Stop Backend
- Press `Ctrl+C` in the Backend terminal (Terminal 1)
- Or close both PowerShell terminals

---

## 📝 Troubleshooting Checklist

- [ ] Backend terminal shows "Server listening" on port 5000
- [ ] Mobile terminal shows "Metro waiting on exp://127.0.0.1:8081"
- [ ] QR code is visible in mobile terminal
- [ ] Expo Go app is installed on phone/emulator
- [ ] Phone is on same WiFi as Windows machine (for physical devices)
- [ ] `.env` file in `artifacts/mobile/` contains `EXPO_PUBLIC_API_URL=http://localhost:5000`

---

## 🎉 You're All Set!

**Scan the QR code from the mobile terminal with Expo Go to view live jobs from 6+ global portals, all India-filtered and ready to apply!**

### Next Steps After Testing
1. Test job filtering, search, and apply functionality
2. Upload a resume to see ATS scores and recommendations
3. Test resume tailoring for selected jobs
4. Report any issues or feature requests
5. When ready, deploy backend to Render + mobile to EAS for production APK

---

**For issues:** Post error logs from either terminal or DM screenshots of jobs not loading.
