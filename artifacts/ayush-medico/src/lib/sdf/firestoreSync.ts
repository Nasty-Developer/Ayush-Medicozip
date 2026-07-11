/**
 * Firestore Sync Engine
 *
 * Writes staged changes to the medicines / categories / brands collections.
 *
 * Designed to survive Firestore's per-project write-quota limits when
 * importing 50,000+ medicines from MediVision Gold:
 *   - Small batches (200–500 ops), never "write everything at once".
 *   - A delay between batches so we stay well under sustained write limits.
 *   - Automatic retry with exponential backoff, specifically for
 *     `resource-exhausted` (quota) errors from Firestore.
 *   - A batch that still fails after retries is skipped (counted as
 *     failed) and the sync *resumes* with the next batch rather than
 *     aborting the whole run.
 *   - Deterministic document IDs for MediVision-imported medicines
 *     (`sdf-<sdfProductId>`), so retrying a batch — or re-running a sync
 *     after a crash — can never create a duplicate medicine.
 *   - Progress is reported after every batch: processed/total, current
 *     batch/total batches, and an ETA based on the observed time-per-batch.
 *
 * Writes ONLY after the admin confirms the sync preview.
 */

import {
  collection,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SyncPreview, SyncProgress, StagedMedicine } from "./types";

/** Firestore hard cap is 500 ops/batch — we stay well under it. */
const DEFAULT_BATCH_SIZE = 250;
/** Base pause between batches to respect sustained write-per-second limits. */
const BATCH_DELAY_MS = 700;
/** Upper bound for the adaptive inter-batch delay once we start seeing quota errors. */
const BATCH_DELAY_MAX_MS = 15000;
/** Max retry attempts for a single batch before giving up on it. */
const MAX_RETRIES = 8;
/** Backoff base — doubles each retry, capped below. */
const RETRY_BASE_DELAY_MS = 1500;
const RETRY_MAX_DELAY_MS = 30000;
/**
 * If this many batches in a row fail *entirely* (all retries exhausted) due
 * to a quota error, the daily/project write quota is almost certainly
 * exhausted rather than a transient rate-limit blip. Grinding through every
 * remaining batch at that point would just spend ~8 retries x 30s each for
 * no benefit and make the sync look "stuck" for a very long time. Instead we
 * stop early with a clear message — already-written medicines are kept
 * (deterministic IDs + the staging diff mean re-running the sync later
 * automatically resumes with only what's left).
 */
const MAX_CONSECUTIVE_QUOTA_BATCH_FAILURES = 3;

type ProgressCallback = (p: Partial<SyncProgress>) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Split an array into chunks of a given size */
function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isResourceExhausted(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  const msg = err instanceof Error ? err.message : String(err);
  return code === "resource-exhausted" || /RESOURCE_EXHAUSTED|resource-exhausted/i.test(msg);
}

/**
 * Runs `commitFn` with automatic retry + exponential backoff. Quota errors
 * (`resource-exhausted`) always get the full retry budget since they are
 * expected to clear on their own; other errors get retried too (transient
 * network blips) but we don't loop forever on a batch that's fundamentally
 * broken.
 */
async function commitWithRetry(
  commitFn: () => Promise<void>,
  onRetry?: (attempt: number, willRetryIn: number, quota: boolean) => void
): Promise<{ ok: true } | { ok: false; error: unknown }> {
  let attempt = 0;
  while (true) {
    try {
      await commitFn();
      return { ok: true };
    } catch (err) {
      attempt++;
      const quota = isResourceExhausted(err);
      if (attempt > MAX_RETRIES) {
        return { ok: false, error: err };
      }
      const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
      onRetry?.(attempt, delay, quota);
      await sleep(delay);
    }
  }
}

/** Tracks elapsed time across batches to compute a live ETA. */
function makeEtaTracker(totalBatches: number) {
  const start = Date.now();
  return (batchesDone: number): number | undefined => {
    if (batchesDone <= 0) return undefined;
    const elapsedMs = Date.now() - start;
    const perBatchMs = elapsedMs / batchesDone;
    const remaining = totalBatches - batchesDone;
    return Math.max(0, Math.round((perBatchMs * remaining) / 1000));
  };
}

// ── Category sync ─────────────────────────────────────────────────────────────

async function syncCategories(
  preview: SyncPreview,
  onProgress: ProgressCallback
): Promise<Map<string, string>> {
  // Map normalised category name → Firestore doc ID
  const catIdMap = new Map<string, string>();

  const toCreate = preview.categories.items.filter((c) => c.action === "create");
  if (!toCreate.length) return catIdMap;

  onProgress({
    message: `Creating ${toCreate.length} new categories…`,
    processed: 0,
    total: toCreate.length,
  });

  const catCollection = collection(db!, "categories");

  for (const chunk of chunks(toCreate, DEFAULT_BATCH_SIZE)) {
    const batch = writeBatch(db!);
    for (const cat of chunk) {
      const ref = doc(catCollection, `cat-${slugify(cat.name)}`);
      batch.set(ref, {
        name: cat.name,
        icon: "💊",
        description: "",
        color: "primary",
        order: 99,
        enabled: true,
        slug: slugify(cat.name),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      catIdMap.set(cat.name.toLowerCase().trim(), ref.id);
    }
    await commitWithRetry(() => batch.commit());
    await sleep(BATCH_DELAY_MS);
  }

  return catIdMap;
}

// ── Brand sync ────────────────────────────────────────────────────────────────

async function syncBrands(
  preview: SyncPreview,
  onProgress: ProgressCallback
): Promise<void> {
  const toCreate = preview.brands.items.filter((b) => b.action === "create");
  if (!toCreate.length) return;

  onProgress({
    message: `Creating ${toCreate.length} new brands…`,
    processed: 0,
    total: toCreate.length,
  });

  const brandCollection = collection(db!, "brands");

  for (const chunk of chunks(toCreate, DEFAULT_BATCH_SIZE)) {
    const batch = writeBatch(db!);
    for (const brand of chunk) {
      const ref = doc(brandCollection, `brand-${slugify(brand.name)}`);
      batch.set(ref, {
        name: brand.name,
        logoUrl: "",
        description: "",
        website: "",
        order: 99,
        enabled: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    await commitWithRetry(() => batch.commit());
    await sleep(BATCH_DELAY_MS);
  }
}

// ── Medicine sync ─────────────────────────────────────────────────────────────

/**
 * Fields shared by both create and update — everything MediVision Gold
 * controls and should always be kept in sync (category, brand, price,
 * stock, searchability). This never touches `imageUrl` or the manual
 * Admin flags (`showInNewArrivals` / `showInSpecialMedicines` / `featured`)
 * so a re-sync never clobbers an admin-uploaded photo or curation choice.
 */
function buildMedicineDoc(m: StagedMedicine) {
  return {
    name: m.name,
    brand: m.brand,
    description: m.genericName || m.packInfo || "",
    stockStatus: m.stockStatus,
    available: m.available,
    sellingPrice: m.sellingPrice,
    mrp: m.mrp,
    discount: m.discount,
    categoryName: m.categoryName,
    order: 99,
    prescriptionRequired: m.prescriptionRequired,
    stockQty: m.stockQty,
    packInfo: m.packInfo,
    sdfProductId: m.sdfProductId,
    updatedAt: Timestamp.now(),
  };
}

/**
 * New medicines only: leaves `imageUrl` empty so the frontend falls back
 * to a category-appropriate placeholder (see `lib/medicineImage.ts` —
 * picked automatically from `categoryName` at render time, no per-medicine
 * image file is ever created), plus default curation flags so an imported
 * medicine is fully functional (searchable, categorized, orderable)
 * without any manual editing.
 */
function buildNewMedicineFields() {
  return {
    imageUrl: "",
    showInNewArrivals: false,
    showInSpecialMedicines: false,
    featured: false,
  };
}

/**
 * Deterministic doc ID for a MediVision-imported medicine. Using a stable
 * ID (instead of an auto-generated one) means retrying a failed/uncertain
 * batch — or re-running the whole sync — always overwrites the *same*
 * document instead of creating a duplicate.
 */
function medicineDocId(sdfProductId: number): string {
  return `sdf-${sdfProductId}`;
}

type MedicineOp = { kind: "create" | "update"; medicine: StagedMedicine };

async function syncMedicines(
  preview: SyncPreview,
  onProgress: ProgressCallback,
  batchSize: number
): Promise<{ created: number; updated: number; failed: number; quotaExhausted: boolean }> {
  // Already-in-memory: the staging engine built the full create/update/skip
  // list up front from the parsed SDF files, so nothing here re-reads or
  // re-parses anything — we just walk the plan.
  const toCreate = preview.medicines.items.filter((m) => m.action === "create");
  const toUpdate = preview.medicines.items.filter((m) => m.action === "update");
  // "skip" items (unchanged medicines already in Firestore) are never
  // touched — no read or write is issued for them.

  let created = 0;
  let updated = 0;
  let failed = 0;
  let retries = 0;
  let quotaExhausted = false;
  let consecutiveQuotaBatchFailures = 0;
  let adaptiveDelay = BATCH_DELAY_MS;

  const medCollection = collection(db!, "medicines");
  const total = toCreate.length + toUpdate.length;

  // A single, unified op queue — one shared batch counter/progress stream
  // for both creates and updates, so "Uploading batch X/Y" always reflects
  // true overall progress instead of resetting between phases.
  const ops: MedicineOp[] = [
    ...toCreate.map((medicine): MedicineOp => ({ kind: "create", medicine })),
    ...toUpdate.map((medicine): MedicineOp => ({ kind: "update", medicine })),
  ];
  const opChunks = chunks(ops, batchSize);
  const totalBatches = opChunks.length;
  const getEta = makeEtaTracker(totalBatches);

  onProgress({
    message: `Preparing to upload ${total.toLocaleString()} medicine(s) in ${totalBatches.toLocaleString()} batch(es)…`,
    processed: 0,
    total,
    currentBatch: 0,
    totalBatches,
  });

  for (let batchIndex = 0; batchIndex < opChunks.length; batchIndex++) {
    const chunkOps = opChunks[batchIndex];
    const batchNum = batchIndex + 1;
    const batch = writeBatch(db!);

    for (const op of chunkOps) {
      const m = op.medicine;
      if (op.kind === "create") {
        const ref = doc(medCollection, medicineDocId(m.sdfProductId));
        batch.set(
          ref,
          { ...buildMedicineDoc(m), ...buildNewMedicineFields(), createdAt: Timestamp.now() },
          { merge: true }
        );
      } else {
        if (!m.existingDocId) continue;
        const ref = doc(db!, "medicines", m.existingDocId);
        batch.set(ref, buildMedicineDoc(m), { merge: true });
      }
    }

    onProgress({
      message: `Uploading batch ${batchNum}/${totalBatches}…`,
      processed: created + updated,
      total,
      currentBatch: batchNum,
      totalBatches,
      etaSeconds: getEta(batchIndex),
      retries,
    });

    let batchHitQuota = false;
    const result = await commitWithRetry(
      () => batch.commit(),
      (attempt, delay, quota) => {
        retries++;
        if (quota) batchHitQuota = true;
        onProgress({
          message: quota
            ? `Firestore write quota hit — retrying batch ${batchNum}/${totalBatches} in ${Math.round(delay / 1000)}s… (attempt ${attempt}/${MAX_RETRIES})`
            : `Batch ${batchNum}/${totalBatches} failed — retrying in ${Math.round(delay / 1000)}s… (attempt ${attempt}/${MAX_RETRIES})`,
          processed: created + updated,
          total,
          currentBatch: batchNum,
          totalBatches,
          retries,
        });
      }
    );

    if (result.ok) {
      consecutiveQuotaBatchFailures = 0;
      // Slowly relax the adaptive delay back down once batches succeed again.
      adaptiveDelay = Math.max(BATCH_DELAY_MS, adaptiveDelay * 0.7);
      for (const op of chunkOps) {
        if (op.kind === "create") created++;
        else updated++;
      }
    } else {
      failed += chunkOps.length;
      if (batchHitQuota || isResourceExhausted(result.error)) {
        consecutiveQuotaBatchFailures++;
        // Ramp the delay between batches up sharply once we're clearly
        // bumping into the quota, instead of hammering it at full speed.
        adaptiveDelay = Math.min(BATCH_DELAY_MAX_MS, adaptiveDelay * 2);
      }
    }

    onProgress({
      message: `Uploaded batch ${batchNum}/${totalBatches} (${(created + updated).toLocaleString()}/${total.toLocaleString()} done${failed ? `, ${failed} failed` : ""})`,
      processed: created + updated,
      total,
      currentBatch: batchNum,
      totalBatches,
      etaSeconds: getEta(batchNum),
      retries,
    });

    if (consecutiveQuotaBatchFailures >= MAX_CONSECUTIVE_QUOTA_BATCH_FAILURES) {
      quotaExhausted = true;
      const remaining = total - (created + updated);
      onProgress({
        message: `Firestore's write quota is exhausted for now. Stopped after batch ${batchNum}/${totalBatches} — ${(created + updated).toLocaleString()} medicine(s) saved, ${remaining.toLocaleString()} remaining. Re-run the sync later (e.g. tomorrow) and it will automatically pick up only what's left.`,
        processed: created + updated,
        total,
        currentBatch: batchNum,
        totalBatches,
        retries,
      });
      break;
    }

    await sleep(adaptiveDelay);
  }

  return { created, updated, failed, quotaExhausted };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface SyncOptions {
  /** Documents per batch. Kept within Firestore-safe 200–500 range. */
  batchSize?: number;
}

export async function executeSyncToFirestore(
  preview: SyncPreview,
  onProgress: ProgressCallback,
  options: SyncOptions = {}
): Promise<{ created: number; updated: number; failed: number; errors: string[]; quotaExhausted: boolean }> {
  if (!db) {
    return { created: 0, updated: 0, failed: 0, errors: ["Firebase not configured"], quotaExhausted: false };
  }

  const batchSize = Math.min(500, Math.max(200, options.batchSize ?? DEFAULT_BATCH_SIZE));
  const errors: string[] = [];

  try {
    onProgress({ message: "Preparing… creating categories and brands." });
    // 1. Categories first (medicines may need them to exist)
    await syncCategories(preview, onProgress);

    // 2. Brands
    await syncBrands(preview, onProgress);

    // 3. Medicines — batched, throttled, retried, resumable.
    const result = await syncMedicines(preview, onProgress, batchSize);

    if (result.quotaExhausted) {
      errors.push(
        `Firestore write quota exhausted — ${result.created + result.updated} medicine(s) saved so far. Re-run the sync to continue automatically (already-written medicines will be skipped).`
      );
    } else if (result.failed > 0) {
      errors.push(
        `${result.failed} medicine(s) could not be written after ${MAX_RETRIES} retries — re-run the sync to retry just the remaining items.`
      );
    }

    return { created: result.created, updated: result.updated, failed: result.failed, errors, quotaExhausted: result.quotaExhausted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    return { created: 0, updated: 0, failed: 0, errors, quotaExhausted: false };
  }
}
