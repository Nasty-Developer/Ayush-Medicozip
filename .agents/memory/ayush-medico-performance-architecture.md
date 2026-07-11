---
name: Ayush Medico performance architecture
description: All Firestore performance fixes applied — counts, pagination, debounce, sync batch settings
---

## Root causes that were fixed

### 1. useMedicineCounts (CRITICAL — always mounted in Header)
**Old**: `subscribeToCollection("medicines", [])` → real-time listener over ALL 51k docs on every page load
**New**: `getCountFromServer()` per category with 5-min in-memory cache; `useMedicinesByCategory.ts`

### 2. Admin DashboardPage
**Old**: 6x `getCollection()` calls (one per collection, one being "medicines" = 51k reads)
**New**: 7x parallel `getCountFromServer()` → 7 aggregation queries, 0 document reads

### 3. useMedicinesByCategory
**Old**: `subscribeToCollection` with only a `where` filter, no limit — streams entire category
**New**: cursor-based paginated `getDocs` with `limit(25)` + `startAfter`; exports `loadMore`, `hasMore`, `loadingMore`

### 4. Admin MedicinesPage
**Old**: `subscribeToCollection("medicines", [orderBy("name")])` → 51k docs subscribed
**New**: `subscribeToCollection("medicines", [orderBy("name"), limit(50)])` — subscription over 50

### 5. Search inputs
**Old**: filter on every keystroke
**New**: `useDebounce(search, 300)` hook; `debouncedSearch` used in filter memo

### 6. Staging engine (root cause of "stuck at start" quota error)
**Old**: `getCollection("medicines")` → one request for 51k docs, immediately hits 50k reads/day limit
**New**: cursor-based paginated reads (500 docs/page, 150ms delay between pages); reports progress

### 7. firestoreSync.ts (frontend fallback)
**Old**: DEFAULT_BATCH_SIZE=250, delay=700ms
**New**: DEFAULT_BATCH_SIZE=75, delay=500ms (adaptive up to 15s on quota); clamp 50-100; circuit breaker at 3 consecutive quota failures

### 8. Backend sync (new — requires FIREBASE_SERVICE_ACCOUNT_JSON)
- `POST /api/sync/start` — accepts staged diff JSON, writes in 75-doc batches from server
- `GET /api/sync/status` — poll every 3s for progress
- `DELETE /api/sync/cancel` — cancel running job
- InventorySyncPage tries backend first; falls back to frontend sync if 503 (no service account)
- Shows "Server Processing" badge (close tab safely) vs "Browser Syncing" (keep tab open)

## Firestore Spark free-tier limits (cause of resource-exhausted)
- 50k reads/day (getCountFromServer counts as 1 read per query, not 1 per doc)
- 20k writes/day
- A full first sync of 51k medicines will still hit both limits — recommend Blaze plan

**Why:** getCountFromServer() shows `resource-exhausted` when daily quota is already exhausted from development; the hook handles this gracefully (returns 0 counts, not a crash)
