# Quick APK Build & Test Guide

## Prerequisites
- GitHub account with access to https://github.com/dishu-13/Asset-Manager
- Android device with USB debugging enabled (or Android emulator)
- `adb` (Android Debug Bridge) installed on your Windows machine

## Step 1: Trigger GitHub Actions Build (Cloud)

1. Open: https://github.com/dishu-13/Asset-Manager/actions
2. Select "Build Android APK" workflow
3. Click "Run workflow"
4. Choose branch: `main`
5. Click "Run workflow" button
6. Wait 5–15 minutes for build to complete

## Step 2: Download APK Artifact

1. Once the run finishes (green checkmark), click on the completed run
2. Scroll to "Artifacts" section
3. Download `app-release-apk` (contains `app-release.apk`)

## Step 3: Install & Test on Device

### On Windows PowerShell:

```powershell
# List connected devices
adb devices

# Install APK (adjust path as needed)
adb install -r .\path\to\app-release.apk

# Or, uninstall first if app exists:
adb uninstall com.autohire.app
adb install .\path\to\app-release.apk

# Launch the app
adb shell am start -n com.autohire.app/.MainActivity
```

### On Device:
- Open the AutoHire app
- Try: Sign in, browse jobs, check backend connectivity
- If network calls fail, ensure backend URL in `.env` is reachable

## Troubleshooting

- **Build fails on GitHub**: Check Actions run logs for error details; paste in Copilot Chat
- **APK won't install**: Uninstall old version first, or check device storage
- **App crashes**: Enable logcat and check error: `adb logcat | grep AutoHire`
- **Network errors**: Verify `EXPO_PUBLIC_API_URL` is correct and backend is running

## Next Steps After Install

1. Test login flow
2. Browse job listings
3. Check backend API calls in network tab / logs
4. Report any issues

---
**Build Workflow Status**: https://github.com/dishu-13/Asset-Manager/actions/workflows/android-build.yml
