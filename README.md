# Fox Play – Frontend

Next.js frontend for Fox Play: login/register, game picker (Game → Variant → Server), and offers. Uses **next-intl** for i18n (en/ua) and talks to the Fox Play backend API for games and auth.

## Prerequisites

- **Node.js** 18+
- **pnpm** (or npm/yarn)

## How to start locally

### 1. Clone and install

```bash
git clone <repo-url>
cd fox-play-fe
pnpm install
```

### 2. Environment

Copy `.env.example` to `.env.local` and fill in:

```env
# Backend API – local dev
NEXT_PUBLIC_API_URL=http://localhost:8080

# Google sign-in – optional; see foxplay/docs/GOOGLE_OAUTH_SETUP.md
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com

# Optional
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_LOCAL_APP_URL=http://localhost:3000
```

For **local development**, `NEXT_PUBLIC_API_URL` must point to your backend (e.g. `http://localhost:8080`). The backend must allow this frontend’s origin in CORS (e.g. `CORS_ORIGIN=http://localhost:3000`).

### 3. Run

```bash
pnpm dev
```

Open **http://localhost:3000**. You’ll be redirected to a locale (e.g. `/en`). Use **Dashboard** to pick a game → variant → server → offers. Games are loaded from `GET /games` on the backend.

---

## Deploy frontend (Vercel)

1. **Import the project** in [Vercel](https://vercel.com) (e.g. connect the GitHub repo).

2. **Environment variables** (Project → Settings → Environment Variables):

   | Variable                    | Value                                 | Notes                                                                                               |
   | --------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
   | `NEXT_PUBLIC_API_URL`       | `https://your-backend.up.railway.app` | Your **Railway backend** URL (no trailing slash). Required so the app can call `/games`, auth, etc. |
   | `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Your Google OAuth client ID          | Optional; for "Continue with Google". See backend docs `GOOGLE_OAUTH_SETUP.md`. |
   | `NEXT_PUBLIC_APP_URL`       | `https://your-app.vercel.app`         | Optional; your Vercel app URL.                                                                      |
   | `NEXT_PUBLIC_SITE_URL`     | `https://foxyplay.app`                | Optional; base URL for metadata (canonical, hreflang). Defaults to https://foxyplay.app.            |
   | `NEXT_PUBLIC_LOCAL_APP_URL` | `http://localhost:3000`               | Optional; for local.                                                                                |

   For production, set **NEXT_PUBLIC_API_URL** to the **Railway backend** URL.

3. **Build**: Vercel uses `pnpm build` (Next.js). No extra build step needed if the repo has a standard Next.js setup.

4. **Backend CORS**: On **Railway** (backend), set **CORS_ORIGIN** to your Vercel URL, e.g. `https://fox-play-fe.vercel.app`, so the browser can call the API from the deployed frontend.

5. **Redeploy** after changing env vars so the new `NEXT_PUBLIC_*` values are baked in.

---

## BE (Railway) + FE (Vercel) together

- **Backend (Railway)**
  - Set `CORS_ORIGIN` to your **Vercel** frontend URL (e.g. `https://fox-play-fe.vercel.app`).
  - Use the public Railway URL as the API base (e.g. `https://foxplay-production.up.railway.app`).

- **Frontend (Vercel)**
  - Set `NEXT_PUBLIC_API_URL` to that **same** Railway URL (e.g. `https://foxplay-production.up.railway.app`).

Then the deployed app will load games and auth from the deployed backend.

---

## Main scripts

| Command      | Description           |
| ------------ | --------------------- |
| `pnpm dev`   | Run dev server (3000) |
| `pnpm build` | Production build      |
| `pnpm start` | Run production build  |
| `pnpm lint`  | Run ESLint            |

## Performance & Lighthouse

- **Canonical / hreflang:** Set `NEXT_PUBLIC_SITE_URL` (e.g. `https://foxyplay.app`) so metadata alternates use the correct base URL. Ukrainian uses BCP 47 `hreflang="uk"` with URL path `/ua/`.
- **Render-blocking:** Next.js and `next/font` already use non-blocking font loading. To reduce blocking further, load third-party scripts (analytics, ads) only after consent or lazily; see `ConditionalAnalytics` and `conditionalScripts.ts`.
- **Deprecated APIs (SharedStorage, Fledge, StorageType.persistent):** These warnings usually come from the browser or a third-party script (e.g. analytics/ads). If you see them in Lighthouse, identify the script (e.g. in Network or by disabling scripts); update it to a version that uses `navigator.storage` and avoids deprecated APIs, or remove it if not needed.

## Tech

- **Next.js** (App Router), **next-intl** (en/ua)
- **React**, **MUI** (Form, etc.)
- **react-hook-form**
- Games/variants/servers and auth from the Fox Play backend API
