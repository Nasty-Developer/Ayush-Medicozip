# Ayush Medico

A production-ready pharmacy platform built as a TypeScript pnpm monorepo.

## Architecture

| Layer | Location | Stack |
|-------|----------|-------|
| Frontend | `artifacts/ayush-medico` | React 19, Vite, Tailwind CSS v4, Radix UI, Framer Motion, Wouter |
| API Server | `artifacts/api-server` | Express 5, Node.js, Pino logging |
| Database ORM | `lib/db` | Drizzle ORM, PostgreSQL |
| API Contract | `lib/api-spec` | OpenAPI YAML + Orval codegen |
| API Client | `lib/api-client-react` | Generated React Query hooks |
| Shared Schemas | `lib/api-zod` | Zod schemas generated from OpenAPI spec |

## Running the Project

Both services are managed as Replit workflows and start automatically:

- **Frontend** (`artifacts/ayush-medico: web`) → preview path `/`, port 18169
- **API Server** (`artifacts/api-server: API Server`) → preview path `/api`, port 8080

### Manual start
```bash
# Install all dependencies
pnpm install

# Start frontend dev server
pnpm --filter @workspace/ayush-medico run dev

# Start API server (build + run)
pnpm --filter @workspace/api-server run dev
```

## Environment Variables

### Managed by Replit (do not set manually)
- `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`

### Required secrets (set via Replit Secrets)
- `SESSION_SECRET` — already set
- `VITE_FIREBASE_API_KEY` — Firebase frontend config
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional — Analytics only)

> **Note:** The frontend gracefully degrades when Firebase vars are missing (`isFirebaseConfigured` guard in `src/lib/firebase.ts`). Auth/Firestore features will be unavailable until these are set.

## Database

The project uses Replit's managed PostgreSQL database. Schema is defined in `lib/db/src/schema/` using Drizzle ORM.

```bash
# Push schema changes to the dev database
pnpm --filter @workspace/db run push
```

Production schema is managed automatically by Replit's Publish flow — never write manual migration scripts.

## API Development

The API contract lives in `lib/api-spec/openapi.yaml`. After editing the spec:

```bash
# Regenerate React Query hooks and Zod schemas
pnpm --filter @workspace/api-spec run generate
```

## Key Pages

| Path | Description |
|------|-------------|
| `/` | Public pharmacy landing page |
| `/admin/login` | Admin login |
| `/admin` | Admin dashboard |
| `/track/:requestId` | Order tracker |

## User Preferences

- Keep the project's existing monorepo structure — do not restructure or migrate it.
- Target: production-ready pharmacy platform, not a demo.
