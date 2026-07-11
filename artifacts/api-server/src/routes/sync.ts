/**
 * Backend Inventory Sync Job
 *
 * Accepts the staged diff from the frontend (after SDF parsing + Firestore comparison),
 * then writes medicines/categories/brands to Firestore in small batches with delays
 * to avoid hitting Firestore write quota limits.
 *
 * Architecture:
 *  - One sync job runs at a time (in-memory singleton).
 *  - Frontend POSTs staged data → backend processes in background.
 *  - Frontend polls GET /api/sync/status every few seconds for progress.
 *  - Batch size: 75 docs per commit (well below the 500 hard cap).
 *  - Inter-batch delay: 400–500ms (adaptive on quota errors).
 *  - Exponential backoff on quota errors: up to 5 retries per batch.
 *
 * Requires FIREBASE_SERVICE_ACCOUNT_JSON to be set.
 */

import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";
import { getFirestoreDb } from "../lib/firebaseAdmin";

const router = Router();

// ── Types ──────────────────────────────────────────────────────────────────────

export interface StagedMedicinePayload {
  name: string;
  brand: string;
  genericName?: string;
  packInfo?: string;
  stockStatus: string;
  available: boolean;
  sellingPrice: number;
  mrp: number;
  discount: number;
  categoryName: string;
  prescriptionRequired: boolean;
  stockQty: number;
  sdfProductId: number;
  existingDocId?: string;
}

interface SyncData {
  medicines: {
    creates: StagedMedicinePayload[];
    updates: StagedMedicinePayload[];
  };
  categories: { name: string }[];
  brands: { name: string }[];
}

export interface SyncJob {
  id: string;
  status: "running" | "done" | "cancelled" | "error";
  phase: "categories" | "brands" | "medicines" | "done";
  created: number;
  updated: number;
  failed: number;
  total: number;
  processed: number;
  currentBatch: number;
  totalBatches: number;
  message: string;
  errors: string[];
  quotaExhausted: boolean;
  cancelRequested: boolean;
  startedAt: number;
}

// ── In-memory job state ────────────────────────────────────────────────────────

let currentJob: SyncJob | null = null;

function makeJob(total: number): SyncJob {
  return {
    id: `sync_${Date.now()}`,
    status: "running",
    phase: "categories",
    created: 0,
    updated: 0,
    failed: 0,
    total,
    processed: 0,
    currentBatch: 0,
    totalBatches: 0,
    message: "Starting…",
    errors: [],
    quotaExhausted: false,
    cancelRequested: false,
    startedAt: Date.now(),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const BATCH_SIZE = 75;
const BASE_DELAY_MS = 400;
const MAX_DELAY_MS = 12000;
const MAX_RETRIES = 5;
const MAX_CONSECUTIVE_QUOTA_FAILURES = 3;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isQuotaError(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  const msg = String(err);
  return code === "resource-exhausted" || /RESOURCE_EXHAUSTED/i.test(msg);
}

function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Background sync ────────────────────────────────────────────────────────────

async function runSyncJob(job: SyncJob, data: SyncData): Promise<void> {
  const firestore = getFirestoreDb();
  if (!firestore) {
    job.status = "error";
    job.message =
      "Backend sync requires FIREBASE_SERVICE_ACCOUNT_JSON. " +
      "Add your Firebase service account JSON as this environment secret and restart the API server.";
    job.errors.push(job.message);
    return;
  }

  try {
    // ── Phase 1: Categories ───────────────────────────────────────────────────
    if (data.categories.length > 0) {
      job.phase = "categories";
      job.message = `Creating ${data.categories.length} new categories…`;

      for (const cat of data.categories) {
        if (job.cancelRequested) break;
        try {
          const ref = firestore.collection("categories").doc(`cat-${slugify(cat.name)}`);
          await ref.set(
            {
              name: cat.name,
              icon: "💊",
              description: "",
              color: "primary",
              order: 99,
              enabled: true,
              slug: slugify(cat.name),
              updatedAt: new Date(),
            },
            { merge: true }
          );
        } catch (err) {
          logger.warn({ err }, `Failed to create category: ${cat.name}`);
        }
        await sleep(50);
      }
    }

    if (job.cancelRequested) {
      job.status = "cancelled";
      job.message = "Sync cancelled by admin.";
      return;
    }

    // ── Phase 2: Brands ───────────────────────────────────────────────────────
    if (data.brands.length > 0) {
      job.phase = "brands";
      job.message = `Creating ${data.brands.length} new brands…`;

      for (const brand of data.brands) {
        if (job.cancelRequested) break;
        try {
          const ref = firestore.collection("brands").doc(`brand-${slugify(brand.name)}`);
          await ref.set(
            {
              name: brand.name,
              logoUrl: "",
              description: "",
              website: "",
              order: 99,
              enabled: true,
              updatedAt: new Date(),
            },
            { merge: true }
          );
        } catch (err) {
          logger.warn({ err }, `Failed to create brand: ${brand.name}`);
        }
        await sleep(50);
      }
    }

    if (job.cancelRequested) {
      job.status = "cancelled";
      job.message = "Sync cancelled by admin.";
      return;
    }

    // ── Phase 3: Medicines ────────────────────────────────────────────────────
    job.phase = "medicines";

    type MedicineOp =
      | { kind: "create"; medicine: StagedMedicinePayload }
      | { kind: "update"; medicine: StagedMedicinePayload };

    const ops: MedicineOp[] = [
      ...(data.medicines.creates ?? []).map(
        (m): MedicineOp => ({ kind: "create", medicine: m })
      ),
      ...(data.medicines.updates ?? []).map(
        (m): MedicineOp => ({ kind: "update", medicine: m })
      ),
    ];

    const allChunks = chunks(ops, BATCH_SIZE);
    job.totalBatches = allChunks.length;
    job.total = ops.length;

    let adaptiveDelay = BASE_DELAY_MS;
    let consecutiveQuotaFailures = 0;

    for (let i = 0; i < allChunks.length; i++) {
      if (job.cancelRequested) {
        job.status = "cancelled";
        job.message = `Sync cancelled after batch ${i}/${allChunks.length}. ${job.processed} medicines saved.`;
        return;
      }

      const chunkOps = allChunks[i];
      job.currentBatch = i + 1;
      job.message = `Writing batch ${i + 1}/${allChunks.length} (${job.processed}/${job.total} done)…`;

      let batchOk = false;
      let attempt = 0;
      let batchHitQuota = false;

      while (!batchOk && attempt < MAX_RETRIES) {
        try {
          const batch = firestore.batch();

          for (const op of chunkOps) {
            const m = op.medicine;
            const docId = `sdf-${m.sdfProductId}`;
            const ref = firestore.collection("medicines").doc(docId);

            const baseData = {
              name: m.name,
              brand: m.brand ?? "",
              description: m.genericName ?? m.packInfo ?? "",
              stockStatus: m.stockStatus,
              available: m.available,
              sellingPrice: m.sellingPrice,
              mrp: m.mrp,
              discount: m.discount,
              categoryName: m.categoryName ?? "",
              order: 99,
              prescriptionRequired: m.prescriptionRequired ?? false,
              stockQty: m.stockQty ?? 0,
              packInfo: m.packInfo ?? "",
              sdfProductId: m.sdfProductId,
              updatedAt: new Date(),
            };

            if (op.kind === "create") {
              batch.set(
                ref,
                {
                  ...baseData,
                  imageUrl: "",
                  showInNewArrivals: false,
                  showInSpecialMedicines: false,
                  featured: false,
                  createdAt: new Date(),
                },
                { merge: true }
              );
            } else {
              batch.set(ref, baseData, { merge: true });
            }
          }

          await batch.commit();
          batchOk = true;
          consecutiveQuotaFailures = 0;
          // Relax delay after successful batch
          adaptiveDelay = Math.max(BASE_DELAY_MS, Math.round(adaptiveDelay * 0.85));

          for (const op of chunkOps) {
            if (op.kind === "create") job.created++;
            else job.updated++;
          }
          job.processed = job.created + job.updated;
        } catch (err) {
          attempt++;
          if (isQuotaError(err)) batchHitQuota = true;

          if (attempt < MAX_RETRIES) {
            const delay = Math.min(1500 * 2 ** (attempt - 1), 30000);
            job.message = `Quota hit on batch ${i + 1}/${allChunks.length} — retry ${attempt}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s…`;
            logger.warn({ err, attempt }, `Sync batch ${i + 1} failed, retrying`);
            await sleep(delay);
          } else {
            logger.error({ err }, `Sync batch ${i + 1} failed after ${MAX_RETRIES} retries`);
          }
        }
      }

      if (!batchOk) {
        job.failed += chunkOps.length;
        if (batchHitQuota) {
          consecutiveQuotaFailures++;
          adaptiveDelay = Math.min(MAX_DELAY_MS, adaptiveDelay * 2);
        }
      }

      if (consecutiveQuotaFailures >= MAX_CONSECUTIVE_QUOTA_FAILURES) {
        job.quotaExhausted = true;
        const remaining = job.total - job.processed;
        job.message = `Firestore write quota exhausted after batch ${i + 1}/${allChunks.length}. ${job.processed} saved, ${remaining} remaining. Re-run sync to continue — already-written medicines are skipped.`;
        job.errors.push(job.message);
        break;
      }

      await sleep(adaptiveDelay);
    }

    job.status = "done";
    job.phase = "done";

    if (!job.quotaExhausted && job.failed === 0) {
      job.message = `Sync complete! ${job.created} created, ${job.updated} updated.`;
    } else if (!job.quotaExhausted && job.failed > 0) {
      const msg = `${job.failed} medicines failed after ${MAX_RETRIES} retries. Re-run to retry.`;
      job.errors.push(msg);
      job.message = `Sync done with ${job.failed} failures. ${job.created} created, ${job.updated} updated.`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Sync job crashed");
    job.status = "error";
    job.message = `Sync failed: ${msg}`;
    job.errors.push(msg);
  }
}

// ── Routes ─────────────────────────────────────────────────────────────────────

/** GET /api/sync/status — poll this for live progress */
router.get("/status", requireAuth, requireAdminEmail, (_req: Request, res: Response): void => {
  if (!currentJob) {
    res.json({ running: false, job: null });
    return;
  }
  res.json({ running: currentJob.status === "running", job: currentJob });
});

/** POST /api/sync/start — submit staged diff, starts background job */
router.post(
  "/start",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    if (currentJob && currentJob.status === "running") {
      res.status(409).json({
        error: "A sync is already running. Cancel it first or wait for it to finish.",
        code: "already_running",
      });
      return;
    }

    const firestore = getFirestoreDb();
    if (!firestore) {
      res.status(503).json({
        error:
          "Backend sync requires FIREBASE_SERVICE_ACCOUNT_JSON. " +
          "Add your Firebase service account JSON as an environment secret (ask admin to configure it).",
        code: "no_service_account",
      });
      return;
    }

    const data = req.body as SyncData;
    if (!data?.medicines) {
      res.status(400).json({ error: "Invalid sync payload — missing medicines field." });
      return;
    }

    const total =
      (data.medicines.creates?.length ?? 0) + (data.medicines.updates?.length ?? 0);
    currentJob = makeJob(total);

    // Fire-and-forget background job
    runSyncJob(currentJob, data).catch((err) => {
      logger.error({ err }, "Sync job crashed unexpectedly");
      if (currentJob) {
        currentJob.status = "error";
        currentJob.message = err instanceof Error ? err.message : String(err);
      }
    });

    res.status(202).json({
      jobId: currentJob.id,
      message: `Sync started — ${total} medicines to process in backend.`,
    });
  }
);

/** DELETE /api/sync/cancel — request cancellation of running job */
router.delete(
  "/cancel",
  requireAuth,
  requireAdminEmail,
  (_req: Request, res: Response): void => {
    if (!currentJob || currentJob.status !== "running") {
      res.status(404).json({ error: "No running sync job to cancel." });
      return;
    }
    currentJob.cancelRequested = true;
    res.json({ message: "Cancellation requested — job will stop after current batch." });
  }
);

export default router;
