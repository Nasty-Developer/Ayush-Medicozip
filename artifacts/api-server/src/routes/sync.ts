/**
 * Backend Inventory Sync — Complete One-Time Import
 *
 * Flow:
 *  1. Admin uploads raw SDF files via POST /api/sync/upload (multipart)
 *  2. Server parses all files in-process (no browser involved)
 *  3. Server writes to Firestore via REST API using the admin's ID token
 *  4. Frontend polls GET /api/sync/status every 2 seconds for live progress
 *
 * Quota strategy (designed to finish — never abort):
 *  - BATCH_SIZE = 25 docs per commit (small batches = less per-request quota)
 *  - BATCH_DELAY_MS = 1500 ms pause between every batch
 *  - On RESOURCE_EXHAUSTED: wait escalating seconds (60 → 120 → 180 → 300),
 *    then cap at 300 s for every subsequent failure. Reset counter on success.
 *  - NEVER abort on quota — keep retrying until the batch commits.
 *
 * Resume / never-restart-from-0:
 *  - After every successful batch the checkpoint is saved to Firestore
 *    (_meta/sync_checkpoint). On re-upload with the same medicine count
 *    the job skips already-written batches automatically.
 *  - Doc IDs are deterministic (sdf-{productId}) so replaying earlier
 *    batches is always safe (idempotent upsert).
 */

import { Router, type Request, type Response } from "express";
import multer from "multer";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";
import { parseSdfBuffers } from "../lib/sdf/parser";
import {
  buildMedicineWrites,
  buildCategoryWrite,
  buildBrandWrite,
  commitBatch,
  QuotaExhaustedError,
  saveCheckpoint,
  loadCheckpoint,
  clearCheckpoint,
} from "../lib/firestoreRest";

const router = Router();

// ── Multer (in-memory storage) ────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const SDF_FIELDS = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: "product_sdf", maxCount: 1 },
  { name: "stock_sdf", maxCount: 1 },
  { name: "company_sdf", maxCount: 1 },
  { name: "category_sdf", maxCount: 1 },
  { name: "drug_sdf", maxCount: 1 },
]);

void upload;

// ── Job state ─────────────────────────────────────────────────────────────────

type JobPhase =
  | "reading"
  | "parsing"
  | "resuming"
  | "categories"
  | "brands"
  | "medicines"
  | "done";

export interface SyncJob {
  id: string;
  status: "running" | "done" | "cancelled" | "error";
  phase: JobPhase;
  message: string;
  total: number;
  processed: number;
  currentBatch: number;
  totalBatches: number;
  written: number;
  skipped: number;       // batches skipped via checkpoint resume
  errors: string[];
  quotaHits: number;     // total quota hits this run (informational)
  cancelRequested: boolean;
  resumeFromBatch: number;
  consecutiveQuotaFailures: number;
  startedAt: number;
  checkpointLoaded: boolean;
}

let currentJob: SyncJob | null = null;

function makeJob(): SyncJob {
  return {
    id: `sync_${Date.now()}`,
    status: "running",
    phase: "reading",
    message: "Reading uploaded files…",
    total: 0,
    processed: 0,
    currentBatch: 0,
    totalBatches: 0,
    written: 0,
    skipped: 0,
    errors: [],
    quotaHits: 0,
    cancelRequested: false,
    resumeFromBatch: 0,
    consecutiveQuotaFailures: 0,
    startedAt: Date.now(),
    checkpointLoaded: false,
  };
}

// ── Tuning ────────────────────────────────────────────────────────────────────

/** Docs per Firestore commit — keep small to stay under per-request quota. */
const BATCH_SIZE = 25;

/** Pause between every successful batch (ms). */
const BATCH_DELAY_MS = 1500;

/**
 * Escalating wait times on quota exhaustion (seconds).
 * The last value is used for all subsequent failures — never aborts.
 */
const QUOTA_WAIT_SECONDS = [60, 120, 180, 300];

function quotaWait(consecutiveFailures: number): number {
  const idx = Math.min(consecutiveFailures - 1, QUOTA_WAIT_SECONDS.length - 1);
  return QUOTA_WAIT_SECONDS[idx]!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Background sync job ───────────────────────────────────────────────────────

async function runSyncJob(
  job: SyncJob,
  buffers: {
    product: Buffer;
    stock: Buffer;
    company?: Buffer;
    category?: Buffer;
    drug?: Buffer;
  },
  idToken: string
): Promise<void> {
  const projectId = process.env["VITE_FIREBASE_PROJECT_ID"] ?? "";
  if (!projectId) {
    job.status = "error";
    job.message = "VITE_FIREBASE_PROJECT_ID is not configured.";
    job.errors.push(job.message);
    return;
  }

  const jobStartedAt = new Date().toISOString();

  try {
    // ── Phase 1: Parse ───────────────────────────────────────────────────────
    job.phase = "parsing";
    job.message = "Parsing SDF files…";

    const parseResult = parseSdfBuffers(buffers);
    const { medicines, allCategoryNames, allBrandNames, stats } = parseResult;

    job.total = medicines.length;
    job.message = `Parsed ${medicines.length.toLocaleString()} products (${stats.stock.toLocaleString()} stock records). Checking checkpoint…`;

    logger.info(
      { products: stats.products, stock: stats.stock },
      "SDF parse complete"
    );

    // ── Phase 2: Resume from checkpoint if available ─────────────────────────
    job.phase = "resuming";
    const medChunks = chunks(medicines, BATCH_SIZE);
    job.totalBatches = medChunks.length;

    const checkpoint = await loadCheckpoint(idToken, projectId);
    if (
      checkpoint &&
      checkpoint.totalMedicines === medicines.length &&
      checkpoint.lastCompletedBatch >= 0
    ) {
      const resumeBatch = checkpoint.lastCompletedBatch + 1;
      if (resumeBatch < medChunks.length) {
        job.resumeFromBatch = resumeBatch;
        job.written = checkpoint.written;
        job.processed = checkpoint.written;
        job.skipped = resumeBatch;
        job.checkpointLoaded = true;
        logger.info(
          { resumeBatch, written: checkpoint.written },
          "Resuming from checkpoint"
        );
        job.message =
          `Resuming from batch ${resumeBatch + 1}/${job.totalBatches} ` +
          `(${checkpoint.written.toLocaleString()} already written from previous run)`;
      } else {
        // Checkpoint says everything was already done
        job.status = "done";
        job.phase = "done";
        job.written = checkpoint.written;
        job.message = `All ${job.written.toLocaleString()} medicines already imported. Upload fresh SDF files or reset to reimport.`;
        return;
      }
    } else {
      job.message = `No checkpoint found — starting fresh import of ${medicines.length.toLocaleString()} medicines…`;
    }

    // ── Phase 3: Categories ──────────────────────────────────────────────────
    if (allCategoryNames.length > 0 && !job.cancelRequested) {
      job.phase = "categories";
      job.message = `Writing ${allCategoryNames.length} categories…`;

      const catWrites = allCategoryNames.map((n) =>
        buildCategoryWrite(n, projectId)
      );
      const catChunks = chunks(catWrites, 50);

      for (const chunk of catChunks) {
        if (job.cancelRequested) break;
        try {
          await commitBatch(chunk, idToken, projectId);
        } catch (err) {
          logger.warn({ err }, "Category batch failed (non-fatal)");
        }
        await sleep(500);
      }
    }

    // ── Phase 4: Brands ──────────────────────────────────────────────────────
    if (allBrandNames.length > 0 && !job.cancelRequested) {
      job.phase = "brands";
      job.message = `Writing ${allBrandNames.length} brands…`;

      const brandWrites = allBrandNames.map((n) =>
        buildBrandWrite(n, projectId)
      );
      const brandChunks = chunks(brandWrites, 50);

      for (const chunk of brandChunks) {
        if (job.cancelRequested) break;
        try {
          await commitBatch(chunk, idToken, projectId);
        } catch (err) {
          logger.warn({ err }, "Brand batch failed (non-fatal)");
        }
        await sleep(500);
      }
    }

    if (job.cancelRequested) {
      job.status = "cancelled";
      job.message = `Sync cancelled. ${job.written.toLocaleString()} medicines written.`;
      return;
    }

    // ── Phase 5: Medicines ───────────────────────────────────────────────────
    job.phase = "medicines";

    for (let i = job.resumeFromBatch; i < medChunks.length; i++) {
      if (job.cancelRequested) {
        job.status = "cancelled";
        job.message =
          `Sync cancelled at batch ${i + 1}/${job.totalBatches}. ` +
          `${job.written.toLocaleString()} medicines written.`;
        return;
      }

      job.currentBatch = i + 1;
      job.message =
        `Uploading batch ${i + 1}/${job.totalBatches} — ` +
        `${job.written.toLocaleString()}/${job.total.toLocaleString()} done…`;

      const batchWrites = buildMedicineWrites(medChunks[i]!, projectId);

      // ── Retry loop: never abort on quota ──────────────────────────────────
      let committed = false;
      while (!committed) {
        try {
          await commitBatch(batchWrites, idToken, projectId);
          committed = true;
          job.consecutiveQuotaFailures = 0;
          job.written += medChunks[i]!.length;
          job.processed = job.written;

          // Save checkpoint after every successful batch
          await saveCheckpoint(
            {
              totalMedicines: medicines.length,
              lastCompletedBatch: i,
              written: job.written,
              batchSize: BATCH_SIZE,
              startedAt: jobStartedAt,
              updatedAt: new Date().toISOString(),
            },
            idToken,
            projectId
          );
        } catch (err) {
          if (err instanceof QuotaExhaustedError) {
            job.consecutiveQuotaFailures++;
            job.quotaHits++;

            const waitSec = quotaWait(job.consecutiveQuotaFailures);
            job.message =
              `⏳ Firestore quota hit (attempt ${job.consecutiveQuotaFailures}) — ` +
              `waiting ${waitSec}s before retrying batch ${i + 1}/${job.totalBatches}… ` +
              `(${job.written.toLocaleString()}/${job.total.toLocaleString()} saved so far, ` +
              `${job.quotaHits} total quota hits this run)`;

            logger.warn(
              {
                batch: i + 1,
                waitSec,
                consecutiveFailures: job.consecutiveQuotaFailures,
                totalQuotaHits: job.quotaHits,
              },
              "Quota hit — waiting before retry (will never abort)"
            );

            await sleep(waitSec * 1000);
          } else {
            // Non-quota error: log and skip this batch rather than hanging
            const msg = err instanceof Error ? err.message : String(err);
            logger.error({ err, batch: i + 1 }, "Batch write failed (non-quota)");
            job.errors.push(`Batch ${i + 1}: ${msg}`);
            committed = true; // Move on
          }
        }
      }

      // Breathing room between batches
      await sleep(BATCH_DELAY_MS);
    }

    // ── Done ─────────────────────────────────────────────────────────────────
    job.status = "done";
    job.phase = "done";

    // Clear checkpoint — all medicines are in
    await clearCheckpoint(idToken, projectId);

    const skipped = job.total - job.written;
    if (job.errors.length === 0) {
      job.message =
        `✅ Import complete! ${job.written.toLocaleString()} medicines written` +
        (job.quotaHits > 0
          ? ` (recovered from ${job.quotaHits} quota hit${job.quotaHits > 1 ? "s" : ""}).`
          : ".");
    } else {
      job.message =
        `Completed with ${job.errors.length} batch error(s). ` +
        `${job.written.toLocaleString()} written, ${skipped.toLocaleString()} skipped.`;
    }

    logger.info(
      { written: job.written, errors: job.errors.length, quotaHits: job.quotaHits },
      "Sync job finished"
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "Sync job crashed");
    job.status = "error";
    job.message = `Sync failed: ${msg}`;
    job.errors.push(msg);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/sync/status
 */
router.get(
  "/status",
  requireAuth,
  requireAdminEmail,
  (_req: Request, res: Response): void => {
    if (!currentJob) {
      res.json({ running: false, job: null });
      return;
    }
    res.json({
      running: currentJob.status === "running",
      job: currentJob,
    });
  }
);

/**
 * POST /api/sync/upload
 * Accepts multipart/form-data with:
 *   product_sdf  (required)
 *   stock_sdf    (required)
 *   company_sdf  (optional)
 *   category_sdf (optional)
 *   drug_sdf     (optional)
 *
 * Returns 202 immediately; sync runs in the background.
 * Poll /api/sync/status for progress.
 */
router.post(
  "/upload",
  requireAuth,
  requireAdminEmail,
  (req: Request, res: Response, next) => {
    SDF_FIELDS(req, res, next);
  },
  async (req: Request, res: Response): Promise<void> => {
    if (currentJob && currentJob.status === "running") {
      res.status(409).json({
        error: "A sync is already running. Cancel it first or wait for it to finish.",
        code: "already_running",
      });
      return;
    }

    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const productFile = files?.["product_sdf"]?.[0];
    const stockFile = files?.["stock_sdf"]?.[0];

    if (!productFile || !stockFile) {
      res.status(400).json({
        error: "PRODUCT.SDF and STOCK.SDF are required.",
        code: "missing_files",
      });
      return;
    }

    const rawToken = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!rawToken) {
      res.status(401).json({ error: "Missing authorization token." });
      return;
    }

    const job = makeJob();
    currentJob = job;

    logger.info(
      { product: productFile.size, stock: stockFile.size },
      "Starting backend sync job"
    );

    runSyncJob(
      job,
      {
        product: productFile.buffer,
        stock: stockFile.buffer,
        company: files?.["company_sdf"]?.[0]?.buffer,
        category: files?.["category_sdf"]?.[0]?.buffer,
        drug: files?.["drug_sdf"]?.[0]?.buffer,
      },
      rawToken
    ).catch((err) => {
      logger.error({ err }, "Sync job crashed unexpectedly");
      if (currentJob) {
        currentJob.status = "error";
        currentJob.message =
          err instanceof Error ? err.message : "Unknown error";
      }
    });

    res.status(202).json({
      jobId: job.id,
      message: `Sync started — ${productFile.size.toLocaleString()} byte product file received.`,
    });
  }
);

/**
 * DELETE /api/sync/cancel
 */
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
    res.json({
      message: "Cancellation requested — job will stop after current batch.",
    });
  }
);

/**
 * DELETE /api/sync/reset
 * Clears the saved checkpoint so the next upload starts from batch 0.
 * Use this when uploading genuinely new SDF files with a different medicine count.
 */
router.delete(
  "/reset",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    if (currentJob?.status === "running") {
      res.status(409).json({
        error: "Cannot reset while a sync is running. Cancel it first.",
      });
      return;
    }

    const rawToken = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!rawToken) {
      res.status(401).json({ error: "Missing authorization token." });
      return;
    }

    const projectId = process.env["VITE_FIREBASE_PROJECT_ID"] ?? "";
    await clearCheckpoint(rawToken, projectId);
    currentJob = null;

    res.json({ message: "Checkpoint cleared. Next upload will start from batch 0." });
  }
);

/**
 * POST /api/sync/start — legacy JSON endpoint (deprecated)
 */
router.post(
  "/start",
  requireAuth,
  requireAdminEmail,
  (_req: Request, res: Response): void => {
    res.status(400).json({
      error:
        "This endpoint is deprecated. Upload raw SDF files to POST /api/sync/upload instead.",
      code: "use_upload_endpoint",
    });
  }
);

export default router;
