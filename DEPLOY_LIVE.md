# AutoHire AI Live Deployment

## 1. Deploy API on Render

Use the repo root and the included `render.yaml`.

Expected result:
- API base URL like `https://autohire-api.onrender.com`

Environment:
- `PORT=10000` is already set in `render.yaml`

## 2. Deploy Web App on Vercel

Project root:
- `artifacts/mobile`

Important env vars in Vercel:
```env
EXPO_PUBLIC_API_URL=https://YOUR-RENDER-API.onrender.com
EXPO_PUBLIC_SUPABASE_URL=https://ksegwlwtvlmiznwgzpal.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Build settings:
- Framework preset: `Other`
- Install command: `pnpm install --ignore-scripts`
- Build command: `pnpm run build:web`
- Output directory: `dist`

## 3. Update Supabase URLs

In Supabase:
- Authentication -> URL Configuration

Set:
- Site URL = `https://YOUR-VERCEL-APP.vercel.app`
- Redirect URL = `https://YOUR-VERCEL-APP.vercel.app/auth/callback`

## 4. Enable Social Providers

Configure in Supabase:
- GitHub
- Google
- LinkedIn
- Apple

Use the callback URL shown inside each Supabase provider page when creating the app on that provider.

## 5. Update Local Mobile Env

For local web testing:
`artifacts/mobile/.env`

```env
EXPO_PUBLIC_SUPABASE_URL=https://ksegwlwtvlmiznwgzpal.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
EXPO_PUBLIC_API_URL=http://localhost:3001
```
