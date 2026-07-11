---
name: Ayush Medico backend-driven SDF sync
description: SDF inventory sync architecture — browser uploads files, server does all parsing and Firestore writes.
---

## Architecture

**Browser**: uploads raw SDF files as multipart/form-data to `POST /api/sync/upload`, then polls `GET /api/sync/status` every 2 seconds.

**Server** (`artifacts/api-server/src/`):
- `lib/sdf/parser.ts` — decodes Buffer as latin-1, parses all 5 SDF types, returns flat medicine list
- `lib/firestoreRest.ts` — Firestore REST API client using the admin's Firebase ID token
- `routes/sync.ts` — `POST /api/sync/upload` (multer, starts job), `GET /api/sync/status`, `DELETE /api/sync/cancel`

## Why Firestore REST API (not Admin SDK)

No `FIREBASE_SERVICE_ACCOUNT_JSON` is configured — `getFirestoreDb()` returns null. Instead:
- Admin's Firebase ID token (already verified by `requireAuth`) is extracted from `Authorization: Bearer` header
- Forwarded to `https://firestore.googleapis.com/v1/projects/{projectId}/databases/(default)/documents:commit`
- Firestore security rules apply (admin user has write access)

## Rate limiting

- 50 docs per batch commit
- 800ms delay between batches → ~60 docs/sec
- 13,000 medicines ≈ 260 batches ≈ 3.5 minutes

## Quota handling

- On `RESOURCE_EXHAUSTED` (429/503 or body contains RESOURCE_EXHAUSTED): wait 90s / 180s / 300s progressively
- After 3 consecutive quota failures: abort with clear message, `job.written` shows how many were saved
- `job.resumeFromBatch` tracks last successful batch — re-run is safe (idempotent writes via `updateMask`)

## UpdateMask strategy

Uses `updateMask` on all medicine writes — only SDF-sourced fields are overwritten. Preserved fields: `imageUrl`, `showInNewArrivals`, `showInSpecialMedicines`, `featured`, `createdAt`.

## Key files

- `artifacts/api-server/src/lib/sdf/parser.ts`
- `artifacts/api-server/src/lib/firestoreRest.ts`
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/ayush-medico/src/pages/admin/InventorySyncPage.tsx`

**Why:** browser-side direct Firestore writes of 13k+ documents exhaust the daily quota and trigger RESOURCE_EXHAUSTED. Server-side with controlled rate avoids this. REST API avoids the service account requirement.
