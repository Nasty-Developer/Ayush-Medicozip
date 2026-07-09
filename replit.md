# Ayush Medico

A medicine delivery and request management web app for Ayush Medico pharmacy (Kurla West, Mumbai).

## Stack

- **Frontend**: React 19 + Vite, Tailwind CSS v4, TanStack Query, wouter, Radix UI
- **Backend**: Express (Node.js/TypeScript), built with esbuild
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Firebase Authentication + Firebase Admin SDK
- **Monorepo**: pnpm workspaces

## Running the project

Both services start automatically via the **Project** run button:

| Service | Command | Port |
|---------|---------|------|
| Frontend (Vite dev) | `pnpm --filter @workspace/ayush-medico run dev` | 18169 |
| API server | `pnpm --filter @workspace/api-server run dev` | 8080 |

To push DB schema changes: `pnpm --filter @workspace/db run push`

## Environment

All Firebase config keys (`VITE_FIREBASE_*`) are stored as shared env vars.  
`DATABASE_URL` is runtime-managed by Replit PostgreSQL.  
`SESSION_SECRET` is stored as a Replit Secret.  
`OPENFDA_API_KEY` is stored as a shared env var (should be rotated and moved to a Secret — see Task #3).

## User preferences
