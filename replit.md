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

## Inventory sources

The medicine catalog comes from exactly two sources:
- Manual entries created in the Admin Panel.
- MediVision Gold inventory sync.

There is no third-party medicine lookup API (previously OpenFDA was explored and has been fully removed).

## Fresh environment setup

On a newly imported/cloned environment the Postgres database starts empty — no tables, no data. To get a fully working app:
1. `pnpm install` (installs all workspace deps)
2. `pnpm --filter @workspace/db run push` (creates tables from the Drizzle schema)
3. Restart both workflows
4. Sign in as an admin user and use the Admin Panel's inventory sync (MediVision Gold SDF upload) to populate categories/medicines — sample `.SDF` files are in `attached_assets/`. Without this step the site runs but the catalog is empty (0 products/categories).

## User preferences
