# AutoHire AI - Job Search & Resume Management Platform

A mobile-first, full-stack job search application with resume management, application tracking, and AI-powered job matching. Built with React Native (Expo), Node.js, and designed for India-based job seekers.

![Status](https://img.shields.io/badge/status-production--ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Platform](https://img.shields.io/badge/platform-Web%20|%20Android%20|%20iOS-blue)

---

## 📱 Features

### Jobs System
- **Multi-source Job Aggregation**: LinkedIn, Naukri, Indeed, Glassdoor, Monster India, Foundit, Shine.com, Internshala, Freshersworld, LetsIntern, Wellfound, Hirect, CutShort, Instahyre, Hirist, Apna, QuikrJobs, WorkIndia, and Greenhouse company boards
- **India-focused**: Automatically filters for India-based roles only
- **Live Verification**: Prefers verified live jobs where possible, with realistic fallback data
- **Smart Filtering**: Search, category, location, experience level, salary range, job type, remote
- **Direct Apply Links**: Get direct URLs to original job postings
- **Pagination & Loading**: Efficient load-more functionality
- **Freshness Indicators**: Shows how recently jobs were posted
- **ATS Scoring**: Preliminary match score for each job

### Resume Management
- **PDF/DOCX/TXT Upload**: Parse multiple file formats
- **Text Normalization**: Fixes broken formatting and encoding issues
- **Before/After Comparison**: See original vs. cleaned preview
- **AI Tailoring**: Tailor resume for specific job descriptions
- **ATS Scoring**: Detailed analysis of keyword matches
- **Multiple Templates**: Save different tailored versions
- **Export/Download**: Download tailored resumes as PDF

### Application Tracker
- **Status Tracking**: All, Applied, Interview, Offer, Rejected
- **Statistics Dashboard**: Total applications, interviews, offers
- **Timeline View**: Track application progress
- **Notes & Reminders**: Add notes for each application
- **Integration**: Auto-save applications from jobs screen

### Dashboard
- **Summary Cards**: Quick stats on jobs, applications, progress
- **Activity Timeline**: Recent actions
- **Insights**: Match rates, success metrics
- **Recommendations**: AI-powered personalized suggestions

### Authentication & Auth
- **Email/Password**: Traditional signup/login
- **Social OAuth**: Google, Apple, LinkedIn, GitHub
- **Secure Sessions**: JWT tokens with refresh
- **Profile Management**: User profile and preferences

### Theme & Design
- **Purple Premium Theme**: Consistent branding across app
- **Light & Dark Mode**: Full support for both themes
- **Mobile-First**: Responsive design from 320px to desktop
- **Solid Surfaces**: Readable surfaces without excessive glass-morphism
- **Curved Bottom Navigation**: Purple curved tab bar

---

## 🛠 Tech Stack

### Frontend (Mobile/Web)
- **React Native** with Expo
- **Expo Router** for navigation
- **React Query** for data fetching
- **React Context** for state management
- **TypeScript** for type safety
- **CSS-in-JS** with React Native StyleSheet

### Backend
- **Node.js** with Express
- **TypeScript**
- **CORS** enabled for cross-origin requests
- **Pino** logging
- **JWT** authentication

### Deployment
- **Frontend**: Vercel (web), EAS Build (mobile/APK)
- **Backend**: Render or Replit
- **Authentication**: Supabase (JWT + OAuth)
- **Database**: PostgreSQL (optional)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and pnpm
- Git
- Expo CLI (for development): `npm install -g eas-cli`

### Installation

```bash
# Clone repository
git clone https://github.com/dishu-13/Asset-Manager.git
cd Asset-Manager

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings
```

### Development

**Option 1: Using Build Script (Recommended)**

```bash
# Linux/Mac
./build.sh dev-backend    # Terminal 1
./build.sh dev-frontend   # Terminal 2

# Windows PowerShell
./build.ps1 -Command dev-backend    # Terminal 1
./build.ps1 -Command dev-frontend   # Terminal 2
```

**Option 2: Manual Start**

```bash
# Terminal 1 - Backend
cd artifacts/api-server
pnpm dev
# API runs at http://localhost:3001

# Terminal 2 - Frontend
cd artifacts/mobile
pnpm dev
# Web frontend at http://localhost:8081
```

### Environment Variables

Create `.env` file:

```env
# Frontend
EXPO_PUBLIC_API_URL=http://localhost:3001
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend
NODE_ENV=development
PORT=3001
LOG_LEVEL=info

# External APIs (Optional)
ADZUNA_APP_ID=your-app-id
ADZUNA_APP_KEY=your-app-key
```

---

## 📦 Build & Deploy

### Web Build (For Vercel)

```bash
./build.sh build-web          # Linux/Mac
./build.ps1 -Command build-web # Windows
```

Output: `artifacts/mobile/dist`

### APK Build (For Android)

```bash
# Requires EAS CLI: npm install -g eas-cli
./build.sh build-apk          # Linux/Mac
./build.ps1 -Command build-apk # Windows
```

### Deployment to Production

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed steps to deploy:
- Frontend to **Vercel**
- Backend to **Render**
- Mobile to **Google Play** or **Manual Distribution**

---

## 📁 Project Structure

```
Asset-Manager/
├── artifacts/
│   ├── api-server/           # Express backend
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints
│   │   │   ├── services/     # Business logic
│   │   │   ├── middleware/   # Auth, logging
│   │   │   └── app.ts        # Express setup
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mobile/               # React Native Frontend
│   │   ├── app/
│   │   │   ├── (tabs)/       # Main tab screens
│   │   │   ├── auth/         # Auth screens
│   │   │   ├── job/          # Job detail screen
│   │   │   └── _layout.tsx   # Root layout
│   │   ├── components/       # Shared components
│   │   ├── context/          # Context providers
│   │   ├── constants/        # Theme, colors
│   │   ├── utils/            # Utilities
│   │   ├── package.json
│   │   └── app.json          # Expo config
│   │
│   └── mockup-sandbox/       # Design mockups
│
├── lib/                      # Shared libraries
│   ├── api-client-react/     # API client hooks
│   ├── api-spec/             # OpenAPI spec
│   └── api-zod/              # Zod schemas
│
├── scripts/                  # Utility scripts
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── build.sh                  # Build script (Mac/Linux)
├── build.ps1                 # Build script (Windows)
├── DEPLOYMENT_GUIDE.md       # Deployment instructions
├── eas.json                  # EAS Build config
├── pnpm-workspace.yaml       # Workspace config
└── README.md                 # This file
```

---

## 🔑 Key Screens

### Jobs Tab
- Search and filter jobs
- View job listings with source badges
- One-tap apply (redirects to original site)
- Job detail page with full description

### Resume Tab
- Upload resume (PDF/DOCX/TXT)
- View parsed/normalized content
- Compare with original version
- Tailor resume for jobs
- View ATS score
- Save tailored versions
- Download resume

### Tracker Tab
- View all applications
- Filter by status (Applied, Interview, Offer, Rejected)
- Add notes to applications
- View statistics (total, interviews, offers)

### Dashboard Tab
- Summary statistics
- Recent activity
- Job recommendations
- Success metrics

### Settings Tab
- Dark mode toggle
- Notification preferences
- Profile management
- Logout

---

## 🔐 Authentication

### Email/Password
1. Enter email and password
2. System validates credentials
3. JWT token stored locally
4. Auto-refresh tokens on expiry

### Social Login (OAuth)
1. Select provider (Google, Apple, LinkedIn, GitHub)
2. Redirected to provider's login
3. User approves permissions
4. Callback received at `/auth/callback`
5. User created/logged in
6. Token stored locally

**Setup Social Login:**
1. Create Supabase project
2. Configure OAuth providers with credentials
3. Set environment variables
4. System automatically detects available providers

---

## 📊 API Endpoints

### Jobs
- `GET /api/jobs` - List all jobs with filters
- `GET /api/jobs/:id` - Get single job details
- `GET /api/sources` - Available job sources

### Resume
- `POST /api/parse-resume` - Parse uploaded resume
- `POST /api/tailor-resume` - Tailor resume for job
- `POST /api/ats-score` - Calculate ATS score
- `GET /api/recommendations` - Get personalized recommendations

### Auth
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/password` - Change password

### Health
- `GET /api/health` - Server health check

---

## 📝 Development Commands

```bash
# Install dependencies
pnpm install

# Run backend
cd artifacts/api-server && pnpm dev

# Run frontend web
cd artifacts/mobile && pnpm dev

# Type check
cd artifacts/mobile && pnpm typecheck

# Build for web
cd artifacts/mobile && pnpm build:web

# Build APK
cd artifacts/mobile && eas build --platform android

# Clean build artifacts
./build.sh clean  # or ./build.ps1 -Command clean
```

---

## 🧪 Testing

```bash
# Jest tests (when configured)
pnpm test

# TypeScript type checking
pnpm typecheck

# Linting (when configured)
pnpm lint
```

---

## 📱 Supported Platforms

- **Web**: Chrome, Firefox, Safari, Edge (responsive design)
- **Android**: API 24+ (built via EAS)
- **iOS**: iOS 13+ (via EAS)

---

## 🌐 Deployment

### Quick Deployment

```bash
# 1. Build production web
./build.sh build-web

# 2. Build APK
./build.sh build-apk

# 3. Deploy to Vercel (auto on git push)
# 4. Deploy to Render (auto on git push)
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for full instructions.

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001
```

### Dependency Issues
```bash
# Clean and reinstall
./build.sh clean
pnpm install
```

### Build Fails
```bash
# Check TypeScript errors
pnpm typecheck

# Verify environment variables
cat .env

# Check logs
cd artifacts/mobile && npm run dev 2>&1 | head -50
```

### APK Build Issues
- Ensure EAS is installed: `npm install -g eas-cli`
- Ensure logged in: `eas login`
- Check `app.json` is valid
- Review EAS dashboard for build logs

---

## 📄 Configuration Files

- **`app.json`** - Expo app configuration
- **`tsconfig.json`** - TypeScript configuration
- **`vercel.json`** - Vercel deployment config
- **`render.yaml`** - Render deployment config
- **`eas.json`** - EAS Build configuration
- **`pnpm-workspace.yaml`** - Monorepo workspace

---

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [Express.js Docs](https://expressjs.com)
- [Vercel Deployment](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Dishu** - [@dishu-13](https://github.com/dishu-13)

---

## 🙏 Acknowledgments

- Job aggregation powered by multiple Indian job platforms
- OAuth via Supabase
- UI inspired by modern job platforms
- Built with ❤️ for Indian job seekers

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/dishu-13/Asset-Manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dishu-13/Asset-Manager/discussions)
- **Email**: support@autohire.ai (when available)

---

**Happy Job Hunting! 🚀**
