# AutoHire AI - Local Testing Guide

## Quick Start Testing (5 minutes)

### Prerequisites
- Node.js 18.20.8+ installed
- pnpm 10.33.0+ installed (`npm install -g pnpm`)
- Git installed

### Step 1: Install Dependencies
```bash
cd d:\Asset-Manager
pnpm install
```
✅ Expected: "Done in Xs using pnpm vX.XX.X"

---

## Backend API Testing

### Start Backend Server

```bash
# Terminal 1: Start Backend Development Server
cd d:\Asset-Manager\artifacts\api-server
pnpm run dev
```

✅ Expected output:
```
Server listening on port 3001
```

### Test Health Endpoint
```bash
# Terminal 2: Test health check
curl http://localhost:3001/api/healthz
```

✅ Expected response:
```json
{"status":"ok"}
```

### Test Jobs API
```bash
# Get all jobs
curl "http://localhost:3001/api/jobs?limit=5"

# Get specific job
curl "http://localhost:3001/api/jobs/job-id-here"
```

✅ Expected: JSON array with job objects containing title, company, location, description

### Test Authentication
```bash
# Signup
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","fullName":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

✅ Expected: JWT token in response

### Test Resume Parsing
```bash
# Parse resume (requires multipart file upload)
curl -X POST http://localhost:3001/api/jobs/parse \
  -F "file=@your-resume.pdf"
```

✅ Expected: Parsed resume data with extracted sections

### Test ATS Scoring
```bash
curl -X POST http://localhost:3001/api/jobs/score \
  -H "Content-Type: application/json" \
  -d '{
    "resume":"Your resume text here",
    "jobDescription":"Job description text here"
  }'
```

✅ Expected: ATS score (0-100) and breakdown

---

## Frontend Testing

### Start Frontend Development Server

```bash
# Terminal 2: Start Frontend
cd d:\Asset-Manager\artifacts\mobile
pnpm run dev
```

✅ Expected output:
```
Starting Metro Bundler
Local:   http://localhost:8081
```

### Test in Web Browser
```
Visit: http://localhost:8081
```

✅ You should see:
- AutoHire AI welcome screen
- Login/Signup options
- Job listing with search
- Navigation tabs at bottom

### Test Web Build
```bash
# Terminal: Build for web
cd d:\Asset-Manager\artifacts\mobile
pnpm run build:web
```

✅ Expected: Files created in `dist/` folder

### Open Web Build Locally
```bash
# Terminal: Serve the web build
cd d:\Asset-Manager\artifacts\mobile
pnpm exec http-server dist
```

✅ Visit: http://localhost:8080

---

## Full Integration Testing

### Step 1: Start Backend
```bash
cd artifacts/api-server
pnpm run dev
```

### Step 2: Start Frontend (new terminal)
```bash
cd artifacts/mobile
pnpm run dev
```

### Step 3: Test User Flow

1. **Sign Up**
   - Click "Sign Up" button
   - Enter email, password, full name
   - Click "Create Account"
   - ✅ Should redirect to login or auto-login

2. **Log In**
   - Enter credentials from signup
   - Click "Log In"
   - ✅ Should see Jobs screen

3. **Search Jobs**
   - Type search term (e.g., "React", "Senior", "Remote")
   - ✅ Should show filtered results
   - Click on a job
   - ✅ Should show job details

4. **Upload Resume**
   - Go to Resume tab
   - Upload PDF/DOCX/TXT file
   - ✅ Should parse and display content

5. **Tailor Resume**
   - View a job
   - Click "Tailor Resume"
   - ✅ Should show AI-tailored resume

6. **View ATS Score**
   - Resume tab → ATS Score section
   - ✅ Should show score 0-100

7. **Track Applications**
   - Applications tab
   - Add application
   - ✅ Should show in tracker

8. **Dashboard**
   - Dashboard tab
   - ✅ Should show stats and insights

9. **Dark Mode**
   - Settings tab
   - Toggle dark mode
   - ✅ Should switch theme

---

## TypeScript Compilation Test

```bash
cd d:\Asset-Manager
pnpm run typecheck
```

✅ Expected output:
```
all workspaces typecheck: Done
```

---

## Build Tests

### Backend Build
```bash
cd artifacts/api-server
pnpm run build
```

✅ Expected: `dist/` folder created with `index.mjs`

### Frontend Web Build
```bash
cd artifacts/mobile
pnpm run build:web
```

✅ Expected: `dist/` folder with `index.html`

### APK Build (requires EAS account)
```bash
eas build --platform android --profile production
```

✅ Expected: EAS Build dashboard shows build progress

---

## API Endpoints to Test

| Endpoint | Method | Body | Test Command |
|----------|--------|------|--------------|
| `/api/healthz` | GET | None | `curl http://localhost:3001/api/healthz` |
| `/api/auth/signup` | POST | `{email, password, fullName}` | See Auth Testing |
| `/api/auth/login` | POST | `{email, password}` | See Auth Testing |
| `/api/auth/profile` | GET | None | `curl -H "Authorization: Bearer TOKEN" http://localhost:3001/api/auth/profile` |
| `/api/jobs` | GET | Query: `limit`, `offset`, `filter` | `curl http://localhost:3001/api/jobs?limit=10` |
| `/api/jobs/:id` | GET | None | `curl http://localhost:3001/api/jobs/123` |
| `/api/jobs/parse` | POST | FormData: `file` | See Resume Testing |
| `/api/jobs/score` | POST | `{resume, jobDescription}` | See ATS Testing |
| `/api/jobs/tailor` | POST | `{resume, jobDescription}` | `curl -X POST ...` with JSON body |

---

## Common Testing Issues & Solutions

### Issue: Backend won't start
```
Error: Port 3001 already in use
```
**Solution:**
```bash
# Kill process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Issue: Dependencies not installing
```
Error: pnpm install fails
```
**Solution:**
```bash
# Clear cache and retry
pnpm store prune
pnpm install
```

### Issue: Frontend shows blank screen
```
Did not compile error
```
**Solution:**
```bash
# Check console for errors and restart
pnpm run dev
```

### Issue: TypeScript compilation errors
```
Error: Type 'X' is missing property 'Y'
```
**Solution:**
```bash
# Already fixed in latest commit
# If still seeing errors:
git pull origin main
pnpm install
```

### Issue: Can't connect to backend from frontend
```
API Error: Connection refused
```
**Solution:**
```bash
# Ensure backend is running on port 3001
# Check EXPO_PUBLIC_API_URL in .env
# Default should be http://localhost:3001
```

---

## Performance Testing

### Load Testing Backend
```bash
# Install Apache Bench
# Test 100 requests with 10 concurrent
ab -n 100 -c 10 http://localhost:3001/api/healthz
```

### Measure Frontend Load Time
```bash
# Check DevTools Performance tab in browser
# Record performance during:
# - Initial page load
# - Job search
# - Job detail view
```

---

## Feature Checklist for Manual Testing

- [ ] User can sign up with email
- [ ] User can log in
- [ ] User can search jobs
- [ ] Job listings show 22 different sources
- [ ] User can click and view job details
- [ ] Resume can be uploaded (PDF/DOCX/TXT)
- [ ] Resume is parsed and displayed
- [ ] Resume can be tailored to job
- [ ] ATS score is calculated (0-100)
- [ ] Applications can be tracked
- [ ] Application status can be changed
- [ ] Dashboard shows statistics
- [ ] Dark mode toggle works
- [ ] Theme persists on refresh
- [ ] User can log out
- [ ] Search filters work (location, salary, remote)
- [ ] Pagination works for jobs
- [ ] OAuth login works (if configured)

---

## Production Testing Checklist

Before deploying to production:

- [ ] All TypeScript errors resolved: `pnpm run typecheck`
- [ ] Backend builds: `cd artifacts/api-server && pnpm run build`
- [ ] Frontend builds: `cd artifacts/mobile && pnpm run build:web`
- [ ] All API endpoints tested
- [ ] User flow tested end-to-end
- [ ] Error handling works
- [ ] Environment variables configured
- [ ] Database migrations run (if needed)
- [ ] SSL certificates valid
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Logging working
- [ ] Monitoring set up

---

## Deployment Testing

### Test Vercel Deployment
```bash
# Deployment happens automatically on git push
# Test at: https://your-asset-manager.vercel.app
```

### Test Render Deployment
```bash
# Deployment happens automatically on git push
# Test at: https://your-asset-manager.render.com/api/healthz
```

### Test EAS APK Build
```bash
eas build --platform android --profile production
# Download and test on Android device
adb install app-release.apk
```

---

## Debugging Tips

### View Backend Logs
```bash
# Logs are output to console with Pino logger
# JSON formatted logs for easy parsing
```

### View Frontend Errors
```bash
# Open browser DevTools (F12)
# Check Console tab for errors
# Check Network tab for API calls
```

### Debug API Calls
```bash
# Install tools like Postman or Insomnia
# Test individual endpoints
# Check request/response format
```

### Remote Debugging
```bash
# For React Native:
# Shake device → "Debug Remote JS"
# Opens debugger in Chrome at chrome://inspect
```

---

## Next Steps After Testing

1. Fix any issues found during testing
2. Create bug report with reproduction steps
3. Update code and commit changes
4. Push to GitHub (auto-triggers production deployments)
5. Monitor production dashboards (Vercel, Render)
6. Collect user feedback
7. Iterate and improve

---

**Happy Testing! 🚀**
