/**
 * Firestore Sync Engine (Frontend fallback)
 *
 * Writes staged changes to Firestore from the browser. This is used when
 * the backend sync is unavailable (no FIREBASE_SERVICE_ACCOUNT_JSON set).
 *
 * The backend sync (POST /api/sync/start) is preferred — it runs
 * server-side with proper credentials, small batches, and automatic
 * progress polling. Use this only as a fallback.
 *
 * Quota-safe design:
 *   - Batch size: 75 ops (reduced from 250; well below the 500 hard cap).
 *   - Base inter-batch delay: 500 ms.
 *   - Adaptive delay ramps up (max 15s) when quota errors appear.
 *   - Exponential backoff per batch: up to 8 retries, capped at 30s.
 *   - Circuit breaker: stops after 3 consecutive quota-failed batches.
 *   - Deterministic doc IDs (sdf-<productId>) make retries idempotent.
 */

import {
  collection,
  doc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SyncPreview, SyncProgress, StagedMedicine } from "./types";

/** Firestore hard cap is 500 ops/batch. Stay well under it. */
const DEFAULT_BATCH_SIZE = 75;
/** Base pause between batches to respect sustained write-per-second limits. */
const BATCH_DELAY_MS = 500;
const BATCH_DELAY_MAX_MS = 15000;
const MAX_RETRIES = 8;
const RETRY_BASE_DELAY_MS = 1500;
const RETRY_MAX_DELAY_MS = 30000;
const MAX_CONSECUTIVE_QUOTA_BATCH_FAILURES = 3;

type ProgressCallback = (p: Partial<SyncProgress>) => void;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
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
      if (attempt > MAX_RETRIES) return { ok: false, error: err };
      const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
      onRetry?.(attempt, delay, quota);
      await sleep(delay);
    }
  }
}

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

async function syncCategories(
  preview: SyncPreview,
  onProgress: ProgressCallback
): Promise<Map<string, string>> {
  const catIdMap = new Map<string, string>();
  const toCreate = preview.categories.items.filter((c) => c.action === "create");
  if (!toCreate.length) return catIdMap;

  onProgress({ message: `Creating ${toCreate.length} new categories…`, processed: 0, total: toCreate.length });

  const catCollection = collection(db!, "categories");

  for (const chunk of chunks(toCreate, DEFAULT_BATCH_SIZE)) {
    const batch = writeBatch(db!);
    for (const cat of chunk) {
      const ref = doc(catCollection, `cat-${slugify(cat.name)}`);
      batch.set(ref, {
        name: cat.name, icon: "💊", description: "", color: "primary",
        order: 99, enabled: true, slug: slugify(cat.name),
        createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
      });
      catIdMap.set(cat.name.toLowerCase().trim(), ref.id);
    }
    await commitWithRetry(() => batch.commit());
    await sleep(BATCH_DELAY_MS);
  }

  return catIdMap;
}

async function syncBrands(preview: SyncPreview, onProgress: ProgressCallback): Promise<void> {
  const toCreate = preview.brands.items.filter((b) => b.action === "create");
  if (!toCreate.length) return;

  onProgress({ message: `Creating ${toCreate.length} new brands…`, processed: 0, total: toCreate.length });

  const brandCollection = collection(db!, "brands");

  for (const chunk of chunks(toCreate, DEFAULT_BATCH_SIZE)) {
    const batch = writeBatch(db!);
    for (const brand of chunk) {
      const ref = doc(brandCollection, `brand-${slugify(brand.name)}`);
      batch.set(ref, {
        name: brand.name, logoUrl: "", description: "", website: "",
        order: 99, enabled: true,
        createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
      });
    }
    await commitWithRetry(() => batch.commit());
    await sleep(BATCH_DELAY_MS);
  }
}

function buildMedicineDoc(m: StagedMedicine) {
  return {
    name: m.name, brand: m.brand,
    description: m.genericName || m.packInfo || "",
    stockStatus: m.stockStatus, available: m.available,
    sellingPrice: m.sellingPrice, mrp: m.mrp, discount: m.discount,
    categoryName: m.categoryName, order: 99,
    prescriptionRequired: m.prescriptionRequired,
    stockQty: m.stockQty, packInfo: m.packInfo,
    sdfProductId: m.sdfProductId, updatedAt: Timestamp.now(),
  };
}

function buildNewMedicineFields() {
  return {
    imageUrl: "", showInNewArrivals: false,
    showInSpecialMedicines: false, featured: false,
  };
}

function medicineDocId(sdfProductId: number): string {
  return `sdf-${sdfProductId}`;
}

type MedicineOp = { kind: "create" | "update"; medicine: StagedMedicine };

async function syncMedicines(
  preview: SyncPreview,
  onProgress: ProgressCallback,
  batchSize: number
): Promise<{ created: number; updated: number; failed: number; quotaExhausted: boolean }> {
  const toCreate = preview.medicines.items.filter((m) => m.action === "create");
  const toUpdate = preview.medicines.items.filter((m) => m.action === "update");

  let created = 0, updated = 0, failed = 0, retries = 0;
  let quotaExhausted = false;
  let consecutiveQuotaBatchFailures = 0;
  let adaptiveDelay = BATCH_DELAY_MS;

  const medCollection = collection(db!, "medicines");
  const total = toCreate.length + toUpdate.length;

  const ops: MedicineOp[] = [
    ...toCreate.map((medicine): MedicineOp => ({ kind: "create", medicine })),
    ...toUpdate.map((medicine): MedicineOp => ({ kind: "update", medicine })),
  ];
  const opChunks = chunks(ops, batchSize);
  const totalBatches = opChunks.length;
  const getEta = makeEtaTracker(totalBatches);

  onProgress({
    message: `Preparing to upload ${total.toLocaleString()} medicine(s) in ${totalBatches.toLocaleString()} batch(es)…`,
    processed: 0, total, currentBatch: 0, totalBatches,
  });

  for (let batchIndex = 0; batchIndex < opChunks.length; batchIndex++) {
    const chunkOps = opChunks[batchIndex];
    const batchNum = batchIndex + 1;
    const batch = writeBatch(db!);

    for (const op of chunkOps) {
      const m = op.medicine;
      if (op.kind === "create") {
        const ref = doc(medCollection, medicineDocId(m.sdfProductId));
        batch.set(ref, { ...buildMedicineDoc(m), ...buildNewMedicineFields(), createdAt: Timestamp.now() }, { merge: true });
      } else {
        if (!m.existingDocId) continue;
        const ref = doc(db!, "medicines", m.existingDocId);
        batch.set(ref, buildMedicineDoc(m), { merge: true });
      }
    }

    onProgress({
      message: `Uploading batch ${batchNum}/${totalBatches}…`,
      processed: created + updated, total, currentBatch: batchNum,
      totalBatches, etaSeconds: getEta(batchIndex), retries,
    });

    let batchHitQuota = false;
    const result = await commitWithRetry(
      () => batch.commit(),
      (attempt, delay, quota) => {
        retries++;
        if (quota) batchHitQuota = true;
        onProgress({
          message: quota
            ? `Write quota hit — retrying batch ${batchNum}/${totalBatches} in ${Math.round(delay / 1000)}s… (attempt ${attempt}/${MAX_RETRIES})`
            : `Batch ${batchNum}/${totalBatches} failed — retrying in ${Math.round(delay / 1000)}s… (attempt ${attempt}/${MAX_RETRIES})`,
          processed: created + updated, total, currentBatch: batchNum, totalBatches, retries,
        });
      }
    );

    if (result.ok) {
      consecutiveQuotaBatchFailures = 0;
      adaptiveDelay = Math.max(BATCH_DELAY_MS, adaptiveDelay * 0.7);
      for (const op of chunkOps) {
        if (op.kind === "create") created++;
        else updated++;
      }
    } else {
      failed += chunkOps.length;
      if (batchHitQuota || isResourceExhausted(result.error)) {
        consecutiveQuotaBatchFailures++;
        adaptiveDelay = Math.min(BATCH_DELAY_MAX_MS, adaptiveDelay * 2);
      }
    }

    onProgress({
      message: `Uploaded batch ${batchNum}/${totalBatches} (${(created + updated).toLocaleString()}/${total.toLocaleString()} done${failed ? `, ${failed} failed` : ""})`,
      processed: created + updated, total, currentBatch: batchNum,
      totalBatches, etaSeconds: getEta(batchNum), retries,
    });

    if (consecutiveQuotaBatchFailures >= MAX_CONSECUTIVE_QUOTA_BATCH_FAILURES) {
      quotaExhausted = true;
      const remaining = total - (created + updated);
      onProgress({
        message: `Firestore write quota exhausted after batch ${batchNum}/${totalBatches}. ${(created + updated).toLocaleString()} saved, ${remaining.toLocaleString()} remaining. Re-run sync later to continue.`,
        processed: created + updated, total, currentBatch: batchNum, totalBatches, retries,
      });
      break;
    }

    await sleep(adaptiveDelay);
  }

  return { created, updated, failed, quotaExhausted };
}

export interface SyncOptions {
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

  // Clamp batch size: smaller than before to reduce quota pressure
  const batchSize = Math.min(100, Math.max(50, options.batchSize ?? DEFAULT_BATCH_SIZE));
  const errors: string[] = [];

  try {
    onProgress({ message: "Preparing… creating categories and brands." });
    await syncCategories(preview, onProgress);
    await syncBrands(preview, onProgress);
    const result = await syncMedicines(preview, onProgress, batchSize);

    if (result.quotaExhausted) {
      errors.push(
        `Write quota exhausted — ${result.created + result.updated} medicine(s) saved. Re-run to continue.`
      );
    } else if (result.failed > 0) {
      errors.push(`${result.failed} medicine(s) failed after ${MAX_RETRIES} retries — re-run to retry.`);
    }

    return { ...result, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    return { created: 0, updated: 0, failed: 0, errors, quotaExhausted: false };
  }
}
