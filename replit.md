# Ayush Medico

A premium pharmacy website for **Ayush Medico**, a medical store in Kurla West, Mumbai.
Built with React 19 + Vite 7 + Tailwind CSS v4 (frontend) and Express.js (backend) in a pnpm monorepo.
Firebase powers the admin dashboard and Firestore database. Cloudinary handles image uploads.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite 7, Tailwind CSS v4, Framer Motion, shadcn/ui, Wouter |
| Admin | Firebase Auth, Firestore (real-time subscriptions + sessionStorage cache) |
| Images | Cloudinary (unsigned upload preset `ayush-medico`, cloud `oiav8jah`) |
| Backend | Express.js 5, TypeScript, Pino logging |
| Monorepo | pnpm workspaces |

---

## How to Run (Replit)

Both services start automatically. Replit injects `PORT` and `BASE_PATH` automatically — do not set them manually.

| Workflow | Command |
|---|---|
| `artifacts/ayush-medico: web` | `pnpm --filter @workspace/ayush-medico run dev` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |

- **Frontend** → preview pane `/`
- **Admin login** → `/admin/login`
- **API health** → `/api/healthz`

---

## Environment Variables

Set these in **Replit Secrets** (dev) and **Vercel Dashboard → Environment Variables** (prod).

| Variable | Required | Notes |
|---|---|---|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase web app ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | optional | e.g. `your-project.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | optional | Firebase sender ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | optional | Google Analytics measurement ID |
| `VITE_ADMIN_EMAIL` | optional | Allowlist a single email for `/admin`. If unset, any authenticated Firebase user is allowed (signup must be disabled in Firebase Console). |
| `VITE_REQUEST_EMAIL` | optional | Mailto address for medicine request form. Defaults to `orders@ayushmedico.com`. |
| `PORT` | Replit only | **Auto-injected by Replit.** Do not set manually. |
| `BASE_PATH` | Replit only | **Auto-injected by Replit.** Defaults to `/` if unset (Vercel, CI). |
| `DATABASE_URL` | future | PostgreSQL for Express backend. Not used by current health-check-only API. |
| `SESSION_SECRET` | future | Already set as Replit secret. |

See `.env.example` for a copy-paste template.

---

## Admin Dashboard Setup

1. Create a Firebase project at https://console.firebase.google.com
2. Enable **Firestore** (Native mode) and **Authentication → Email/Password**
3. In Authentication → Settings → **User actions**, **disable** "Enable create (sign-up)" so only manually created accounts can log in
4. Create one admin account manually: Authentication → Add user
5. Deploy Firestore rules: `firebase deploy --only firestore:rules` (rules are in `firestore.rules`)
6. Set all `VITE_FIREBASE_*` secrets in Replit and Vercel
7. Navigate to `/admin/login` to sign in

---

## Vercel Deployment

`vercel.json` is configured at the repo root:
- **Build command:** `pnpm install && pnpm --filter @workspace/ayush-medico run build`
- **Output dir:** `artifacts/ayush-medico/dist/public`
- **SPA routing:** extension-less paths rewrite to `index.html`; static files (`/favicon.svg`, `/robots.txt`, etc.) are served directly
- Set `BASE_PATH=/` in Vercel environment variables (already in `vercel.json` build env)

---

## Business Details

- **Store:** Ayush Medico
- **Address:** Shop No 67, Halav Pool Rd, Makad Wala Chawl, Kurla West, Mumbai, Maharashtra 400070
- **Phone:** +91 98332 73838

---

## User Preferences

- Keep the existing monorepo structure — do not restructure or migrate.
- Do not redesign or replace existing UI/animations — extend only.
