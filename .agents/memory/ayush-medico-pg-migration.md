---
name: Ayush Medico PostgreSQL migration
description: Full migration from Firestore to PostgreSQL — what's in PG, what was removed, what Firebase still does.
---

# Ayush Medico — PostgreSQL Migration (complete)

## What Firebase is now used for
- **Authentication only**: login, registration, password reset, session tokens.
- Firebase Storage: prescription photo uploads (still via `storage` export in firebase.ts).
- Analytics: optional, only if `VITE_FIREBASE_MEASUREMENT_ID` is set.
- **Firestore is no longer used at all.** The `db` Firestore export was removed from `firebase.ts`.

## All data is now in PostgreSQL (Drizzle schema in lib/db/src/schema/)
| Table | Replaces |
|---|---|
| medicines, categories, companies, drug_groups, stock | Firestore `medicines`, `categories`, `brands` collections |
| orders, order_items | Firestore `orders` collection |
| addresses | Firestore user address subcollection |
| coupons | — |
| inquiries | Firestore `inquiries` collection |
| testimonials, faqs | Firestore `testimonials`, `faqs` collections |
| order_notifications | Firestore `notifications` collection |
| settings | Firestore `settings` collection (docs: `store`, `homepage`, `announcement`) |
| users, admin_users | — |

## API routes for settings
- `GET /api/settings/:key` — public, returns the JSONB value (empty `{}` if not yet set)
- `PUT /api/settings/:key` — admin only, upserts the JSONB value
- Keys: `store`, `homepage`, `announcement`

## Dead code removed
- `artifacts/ayush-medico/src/lib/firestoreHelpers.ts` — deleted
- `artifacts/ayush-medico/src/lib/sdf/stagingEngine.ts` — deleted (was Firestore diff engine, InventorySyncPage uses PG backend)
- `artifacts/ayush-medico/src/lib/sdf/firestoreSync.ts` — deleted (was browser-side Firestore write fallback)
- `artifacts/api-server/src/lib/firestoreRest.ts` — deleted (was server-side Firestore REST writer; sync.ts uses PG directly)

## SDF sync flow (current)
1. Admin uploads SDF files via `POST /api/sync/upload` (multipart)
2. Server (`artifacts/api-server/src/routes/sync.ts`) parses and bulk-upserts to PG
3. Frontend polls `GET /api/sync/status` for live progress
4. No Firestore involved at any step

## AnnouncementContext
Replaced `onSnapshot` (real-time Firestore) with 60-second polling of `/api/settings/announcement`.
This is sufficient for an announcement banner — real-time is not needed.

**Why:** Firestore read quota limits and the need for a single source of truth in PG.
