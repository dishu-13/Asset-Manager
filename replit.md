# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI via Replit AI Integrations (`gpt-5.2`)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── mobile/             # AutoHire AI - Expo React Native mobile app
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## AutoHire AI Mobile App (artifacts/mobile)

**AutoHire AI** is a smart job finder and resume optimizer mobile app built with Expo React Native.

### Features
- **Job Board**: Browse live jobs from Remotive + Arbeitnow APIs, with pull-to-refresh, skeleton loaders, source badges, filters
- **Job Detail**: Full job info, ATS keyword breakdown, AI resume tailoring, apply tracking with toast notifications
- **Resume Builder**: Upload/edit resume, two templates (Classic + Modern) with live preview, AI Tailor tab, Export/Share
- **AI Resume Tailoring**: OpenAI gpt-5.2 integration via Replit AI Integrations — analyzes resume vs job description, returns tailored resume + keywords + suggestions + ATS score
- **Applications Tracker**: Track all applications with status (Applied/Pending/Rejected)
- **Dashboard**: LinearGradient hero banner, AI-powered "Recommended For You" section, bento stats grid, funnel visualization
- **Profile Page**: Editable profile with bio, contact info, skills, experience, education — fully editable with form UX
- **Authentication**: JWT-based auth with bcrypt password hashing (backend), falls back to local auth gracefully
- **Toast Notifications**: Success/error/info/loading toasts for all major actions
- **Dark Mode**: Full light/dark theme support via ThemeContext

### Key Files

#### Mobile (artifacts/mobile)
- `app/(tabs)/_layout.tsx` — Tab navigation (Jobs, Resume, Tracker, Dashboard, Profile)
- `app/(tabs)/index.tsx` — Jobs list with live scraping
- `app/(tabs)/resume.tsx` — Resume editor + templates + AI Tailor
- `app/(tabs)/dashboard.tsx` — Stats dashboard with AI recommendations
- `app/(tabs)/profile.tsx` — Editable user profile
- `app/(tabs)/applications.tsx` — Application tracker
- `app/job/[id].tsx` — Job detail with ATS score
- `app/login.tsx` — Login screen with error handling + toast
- `app/signup.tsx` — Signup screen with validation + toast
- `context/AuthContext.tsx` — JWT auth with API fallback
- `context/AppContext.tsx` — Jobs, applications, saved jobs state
- `context/ThemeContext.tsx` — Dark/light theme
- `context/ToastContext.tsx` — Toast notification system
- `utils/atsUtils.ts` — Local ATS keyword matching

#### API Server (artifacts/api-server)
- `src/routes/auth.ts` — POST /auth/signup, /auth/login, /auth/logout, GET /auth/me, PUT /auth/profile
- `src/routes/jobs.ts` — GET /jobs, /jobs/:id, POST /tailor-resume (AI), /ats-score, /recommendations
- `src/services/authService.ts` — In-memory user store with JWT + bcrypt
- `src/services/aiService.ts` — OpenAI resume tailoring with local fallback
- `src/services/jobService.ts` — Remotive + Arbeitnow scraping with 5-min TTL cache
- `src/middleware/auth.ts` — JWT middleware (requireAuth, optionalAuth)

### Auth Notes
- JWT secret from env `JWT_SECRET` (falls back to dev default)
- Tokens expire in 7 days
- User store is in-memory (resets on server restart)
- Mobile falls back to local auth when API not reachable

### AI Integration Notes
- `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY` auto-set via Replit
- Model: `gpt-5.2`
- Falls back to local keyword-matching algorithm if OpenAI fails
- Endpoint: `POST /tailor-resume` with `{ resume, jobDescription, useAI: true }`

### Theme Colors
- tint: `#4F46E5` (indigo)
- violet: `#8B5CF6`
- emerald: `#10B981`
- danger: `#F43F5E`
- warning: `#F59E0B`

### Source Badge Colors
- Remotive: `#10B981`
- Arbeitnow: `#6366F1`
- LinkedIn: `#0A66C2`
- JSearch: `#FF6B00`
- Glassdoor: `#00A360`
- Adzuna: `#FF5B5B`

### API Routes
- `GET /health` — health check
- `POST /auth/signup` — create account (name, email, password)
- `POST /auth/login` — login (email, password) → JWT token
- `GET /auth/me` — get current user (requires Bearer token)
- `PUT /auth/profile` — update profile (requires Bearer token)
- `POST /auth/logout` — invalidate session
- `GET /jobs` — list jobs with filtering/pagination
- `GET /jobs/:id` — get single job
- `POST /tailor-resume` — AI tailor resume against job
- `POST /ats-score` — compute ATS score
- `POST /recommendations` — AI-matched job recommendations
