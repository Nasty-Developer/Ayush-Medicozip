---
name: Ayush Medico backend-driven SDF sync
description: SDF inventory sync architecture — browser uploads files, server does all parsing and Firestore writes.
---

## Architecture

**Browser**: uploads raw SDF files as multipart/form-data to `POST /api/sync/upload`, then polls `GET /api/sync/status` every 2 seconds.

**Server** (`artifacts/api-server/src/`):
- `lib/sdf/parser.ts` — decodes Buffer as latin-1, parses all 5 SDF types, returns flat medicine list
- `lib/firestoreRest.ts` — Firestore REST API client using the admin's Firebase ID token
- `routes/sync.ts` — `POST /api/sync/upload`, `GET /api/sync/status`, `DELETE /api/sync/cancel`, `DELETE /api/sync/reset`

## Why Firestore REST API (not Admin SDK)

No `FIREBASE_SERVICE_ACCOUNT_JSON` is configured — uses the admin's Firebase ID token from `Authorization: Bearer` header forwarded to Firestore REST. Security rules apply (admin user has write access).

## Rate limiting (one-time import settings)

- **25 docs per batch** (smaller = less per-request quota pressure)
- **1500ms delay between batches**
- ~13,000 medicines ≈ 520 batches ≈ ~13 minutes uninterrupted

## Quota handling — NEVER ABORTS

- On `RESOURCE_EXHAUSTED` (429/503): wait escalating seconds `[60, 120, 180, 300]`, capped at 300 s for all subsequent failures, then retry the same batch
- **No circuit breaker** — retries forever until the batch commits
- `job.quotaHits` tracks total quota hits for the run (informational)

## Checkpoint / resume (never restart from 0%)

After every successful batch, saves `_meta/sync_checkpoint` doc to Firestore:
```json
{ "totalMedicines": N, "lastCompletedBatch": K, "written": W, "batchSize": 25, "startedAt": "...", "updatedAt": "..." }
```
On new upload: reads checkpoint; if `totalMedicines` matches the freshly parsed count, resumes from `lastCompletedBatch + 1`. On clean completion, deletes the checkpoint doc.

`DELETE /api/sync/reset` clears the checkpoint so the next upload starts fresh (use when SDF files have a different medicine count).

## UpdateMask strategy

Uses `updateMask` on all medicine writes — only SDF-sourced fields are overwritten. Preserved: `imageUrl`, `showInNewArrivals`, `showInSpecialMedicines`, `featured`, `createdAt`.

## Key files

- `artifacts/api-server/src/lib/sdf/parser.ts`
- `artifacts/api-server/src/lib/firestoreRest.ts` (includes saveCheckpoint / loadCheckpoint / clearCheckpoint)
- `artifacts/api-server/src/routes/sync.ts`
- `artifacts/ayush-medico/src/pages/admin/InventorySyncPage.tsx`

**Why:** browser-side direct Firestore writes of 13k+ documents exhaust the daily quota. Server-side with controlled rate + persistent checkpoint + infinite retry ensures every medicine is eventually imported.
