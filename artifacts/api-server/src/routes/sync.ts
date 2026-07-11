/**
 * Backend Inventory Sync — Production-Ready Architecture
 *
 * Flow:
 *  1. Admin uploads raw SDF files via POST /api/sync/upload (multipart)
 *  2. Server parses all files in-process (no browser involved)
 *  3. Server writes to Firestore via REST API using the admin's ID token
 *     (no service account needed — the token is already verified by requireAuth)
 *  4. Frontend polls GET /api/sync/status every 2 seconds for live progress
 *
 * Rate limiting:
 *  - BATCH_SIZE medicines per commit (Firestore max is 500)
 *  - BATCH_DELAY_MS pause between batches
 *  - On RESOURCE_EXHAUSTED: wait QUOTA_WAIT_MS then retry the same batch
 *  - After 3 consecutive quota failures: abort with a clear message
 *
 * Resume behaviour:
 *  - job.resumeFromBatch tracks last successful batch index
 *  - If the server crashes mid-job the admin re-uploads and the write is
 *    idempotent (sdf-{id} doc IDs with updateMask = safe to re-run)
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
} from "../lib/firestoreRest";

const router = Router();

// ── Multer (in-memory storage) ────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
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

void upload; // silence unused warning

// ── Job state ─────────────────────────────────────────────────────────────────

type JobPhase =
  | "reading"
  | "parsing"
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
  errors: string[];
  quotaExhausted: boolean;
  cancelRequested: boolean;
  resumeFromBatch: number;
  consecutiveQuotaFailures: number;
  startedAt: number;
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
    errors: [],
    quotaExhausted: false,
    cancelRequested: false,
    resumeFromBatch: 0,
    consecutiveQuotaFailures: 0,
    startedAt: Date.now(),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 800;
const QUOTA_WAIT_SECONDS = [90, 180, 300];
const MAX_QUOTA_FAILURES = 3;

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

  try {
    // ── Phase 1: Parse ───────────────────────────────────────────────────────
    job.phase = "parsing";
    job.message = "Parsing SDF files…";

    const parseResult = parseSdfBuffers(buffers);

    const { medicines, allCategoryNames, allBrandNames, stats } = parseResult;

    job.total = medicines.length;
    job.message = `Parsed ${medicines.length.toLocaleString()} products (${stats.stock.toLocaleString()} stock records). Preparing upload…`;

    logger.info(
      { products: stats.products, stock: stats.stock },
      "SDF parse complete"
    );

    // ── Phase 2: Categories ──────────────────────────────────────────────────
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
        await sleep(300);
      }
    }

    // ── Phase 3: Brands ──────────────────────────────────────────────────────
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
        await sleep(300);
      }
    }

    if (job.cancelRequested) {
      job.status = "cancelled";
      job.message = `Sync cancelled. ${job.written.toLocaleString()} medicines written.`;
      return;
    }

    // ── Phase 4: Medicines ───────────────────────────────────────────────────
    job.phase = "medicines";
    const medChunks = chunks(medicines, BATCH_SIZE);
    job.totalBatches = medChunks.length;

    for (let i = job.resumeFromBatch; i < medChunks.length; i++) {
      if (job.cancelRequested) {
        job.status = "cancelled";
        job.message = `Sync cancelled at batch ${i + 1}/${job.totalBatches}. ${job.written.toLocaleString()} medicines written.`;
        return;
      }

      job.currentBatch = i + 1;
      job.message = `Uploading batch ${i + 1}/${job.totalBatches} (${job.written.toLocaleString()}/${job.total.toLocaleString()} done)…`;

      const batchWrites = buildMedicineWrites(medChunks[i]!, projectId);

      // Retry loop with quota backoff
      let committed = false;
      while (!committed) {
        try {
          await commitBatch(batchWrites, idToken, projectId);
          committed = true;
          job.consecutiveQuotaFailures = 0;
          job.resumeFromBatch = i + 1;
          job.written += medChunks[i]!.length;
          job.processed = job.written;
        } catch (err) {
          if (err instanceof QuotaExhaustedError) {
            job.consecutiveQuotaFailures++;

            if (job.consecutiveQuotaFailures > MAX_QUOTA_FAILURES) {
              const remaining = job.total - job.written;
              job.quotaExhausted = true;
              job.status = "done";
              job.phase = "done";
              job.message =
                `Firestore quota exhausted after ${job.consecutiveQuotaFailures} retries. ` +
                `${job.written.toLocaleString()} medicines saved, ${remaining.toLocaleString()} remaining. ` +
                `Re-run sync tomorrow or upgrade to Blaze plan to continue.`;
              job.errors.push(job.message);
              logger.warn(job.message);
              return;
            }

            const waitSec =
              QUOTA_WAIT_SECONDS[job.consecutiveQuotaFailures - 1] ?? 300;
            job.message =
              `Firestore quota hit — waiting ${waitSec}s before retrying batch ${i + 1}/${job.totalBatches}… ` +
              `(${job.written.toLocaleString()}/${job.total.toLocaleString()} saved so far)`;
            logger.warn(
              { batch: i + 1, waitSec, failures: job.consecutiveQuotaFailures },
              "Quota hit, waiting"
            );
            await sleep(waitSec * 1000);
          } else {
            // Non-quota error: log and skip this batch
            const msg = err instanceof Error ? err.message : String(err);
            logger.error({ err, batch: i + 1 }, "Batch write failed");
            job.errors.push(`Batch ${i + 1}: ${msg}`);
            committed = true; // Skip and continue
          }
        }
      }

      // Breathing room between batches to avoid sustained quota pressure
      await sleep(BATCH_DELAY_MS);
    }

    // ── Done ─────────────────────────────────────────────────────────────────
    job.status = "done";
    job.phase = "done";
    const skipped = job.total - job.written;
    if (job.errors.length === 0) {
      job.message = `Completed. ${job.written.toLocaleString()} medicines written successfully.`;
    } else {
      job.message =
        `Completed with ${job.errors.length} batch error(s). ` +
        `${job.written.toLocaleString()} written, ${skipped.toLocaleString()} skipped.`;
    }

    logger.info(
      { written: job.written, errors: job.errors.length },
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
 * Poll every 2 seconds from the frontend for live progress.
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
 * Accepts multipart/form-data with fields:
 *   product_sdf  (required) — PRODUCT.SDF buffer
 *   stock_sdf    (required) — STOCK.SDF buffer
 *   company_sdf  (optional)
 *   category_sdf (optional)
 *   drug_sdf     (optional)
 *
 * Returns 202 immediately; the actual sync runs in the background.
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

    // Extract raw ID token — already verified by requireAuth middleware
    const rawToken = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!rawToken) {
      res.status(401).json({ error: "Missing authorization token." });
      return;
    }

    const job = makeJob();
    currentJob = job;

    logger.info(
      {
        product: productFile.size,
        stock: stockFile.size,
      },
      "Starting backend sync job"
    );

    // Fire-and-forget
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
 * POST /api/sync/start — legacy JSON endpoint
 * Kept for backwards compatibility; redirects callers to use /upload instead.
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
