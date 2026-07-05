# Ayush Medico

A premium pharmacy website for **Ayush Medico**, a medical store located in Kurla West, Mumbai. Built with React + Vite (frontend) and Express.js (backend) in a pnpm monorepo.

## Stack

- **Frontend** (`artifacts/ayush-medico`): React 19, Vite 7, Tailwind CSS v4, Framer Motion, shadcn/ui, Wouter (routing), TanStack Query
- **Backend** (`artifacts/api-server`): Express.js 5, TypeScript (ESBuild bundled), Pino logging
- **Shared libs**:
  - `lib/api-spec` — OpenAPI spec + Orval codegen config
  - `lib/api-client-react` — Generated React Query hooks from the OpenAPI spec
  - `lib/api-zod` — Generated Zod schemas from the OpenAPI spec
  - `lib/db` — Drizzle ORM + PostgreSQL (requires `DATABASE_URL`)

## How to Run

Both services start automatically via Replit workflows:

| Workflow | Command |
|---|---|
| `artifacts/ayush-medico: web` | `pnpm --filter @workspace/ayush-medico run dev` |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` |

- **Frontend** is served at `/` (preview pane root)
- **API server** is served at `/api` (health check: `GET /api/healthz`)

## Environment Variables

| Variable | Required by | Notes |
|---|---|---|
| `PORT` | Both services | **Injected automatically by Replit** — do not set manually. Each artifact gets its own port. |
| `BASE_PATH` | Frontend (Vite) | **Injected automatically by Replit** — the URL prefix for the artifact (e.g. `/`). |
| `DATABASE_URL` | `lib/db`, `artifacts/api-server` | PostgreSQL connection string. Not needed for the current health-check-only API. Provision a Replit PostgreSQL database to enable it. |
| `SESSION_SECRET` | (future auth) | Already set as a Replit secret. |
| `VITE_REQUEST_EMAIL` | Frontend | Optional. Defaults to `orders@ayushmedico.com`. Override to change the mailto address used in the medicine request form. |

> **Note on request flow**: medicine requests are handled entirely client-side via WhatsApp deep-link and `mailto:`. No order data is sent to or stored on the backend.

## Business Details

- **Store**: Ayush Medico
- **Address**: Shop No 67, Halav Pool Rd, Makad Wala Chawl, Kurla West, Mumbai, Maharashtra 400070
- **Phone**: +91 98332 73838

## User Preferences

- Keep the existing monorepo structure — do not restructure or migrate.
