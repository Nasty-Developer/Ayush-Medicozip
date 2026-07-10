---
name: Ayush Medico Firestore write-quota-safe sync
description: How the MediVision Gold inventory sync avoids Firestore RESOURCE_EXHAUSTED errors at 50k+ scale
---

The inventory sync engine (`lib/sdf/firestoreSync.ts`) batches writes at 200–500 docs/batch, sleeps between batches, and retries with exponential backoff specifically on `resource-exhausted` — never writes all 50k+ medicines in one shot.

**Why:** at ~51k MediVision-imported medicines, unthrottled batched writes hit Firestore's per-project write-quota (`RESOURCE_EXHAUSTED`) and aborted the whole sync.

**How to apply:** MediVision-imported medicines get a **deterministic Firestore doc ID** (`sdf-<sdfProductId>`) instead of an auto-generated one, written with `set(..., { merge: true })`. This makes retrying a failed batch — or re-running the whole sync after a crash — idempotent and duplicate-free, since the same product always resolves to the same doc. Categories/brands also use deterministic slugs as doc IDs for the same reason. If you touch this sync path, preserve the deterministic-ID + merge pattern or duplicates will return.

Client-side Firestore SDK (`firebase/firestore`) has no BulkWriter (that's Admin-SDK/Node-only) — this project runs the sync from the browser, so throttled `writeBatch` + manual backoff is the only option, not BulkWriter.
