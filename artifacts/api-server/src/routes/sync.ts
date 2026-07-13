/**
 * Backend Inventory Sync — PostgreSQL Importer
 *
 * Replaces the Firestore-based importer entirely.
 * All medicine catalogue data is now stored in PostgreSQL.
 *
 * Flow:
 *  1. Admin uploads SDF files via POST /api/sync/upload (multipart)
 *  2. Server parses all files in-process
 *  3. Server bulk-upserts into PostgreSQL:
 *       companies → categories → drug_groups → medicines → stock
 *  4. Frontend polls GET /api/sync/status for live progress
 *
 * Job state is persisted to PostgreSQL (settings table, key "sync:current_job")
 * so that Vercel serverless invocations (which may land on different instances)
 * can all read/write the same job state. On Replit (persistent process) the
 * in-memory currentJob is the fast path; DB is the authoritative fallback.
 *
 * PostgreSQL upserts are idempotent (ON CONFLICT product_code DO UPDATE).
 * Re-importing the same files is safe — admin-managed flags (featured,
 * newArrival, special, imageUrl) are NEVER overwritten by the importer.
 *
 * Performance: ~13k medicines import in ~5–15 seconds with no throttling.
 * No Firestore is used or referenced anywhere in this file.
 */

import { Router, type Request, type Response } from "express";
import multer from "multer";
import { sql, inArray, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  companiesTable,
  categoriesTable,
  drugGroupsTable,
  medicinesTable,
  stockTable,
  settingsTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";
import { parseSdfBuffers } from "../lib/sdf/parser";

const router = Router();

// ── Multer ────────────────────────────────────────────────────────────────────

const SDF_FIELDS = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
}).fields([
  { name: "product_sdf",  maxCount: 1 },
  { name: "stock_sdf",    maxCount: 1 },
  { name: "company_sdf",  maxCount: 1 },
  { name: "category_sdf", maxCount: 1 },
  { name: "drug_sdf",     maxCount: 1 },
]);

// ── Job state ─────────────────────────────────────────────────────────────────

type JobPhase =
  | "idle"
  | "parsing"
  | "companies"
  | "categories"
  | "drug_groups"
  | "medicines"
  | "stock"
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
  cancelRequested: boolean;
  startedAt: number;
  report: {
    medicines: number;
    companies: number;
    categories: number;
    drugGroups: number;
    stockRecords: number;
    parseErrors: number;
    skipped: number;
    durationMs: number;
  };
}

/** In-memory fast path — valid within a single long-lived process (Replit). */
let currentJob: SyncJob | null = null;

// ── DB persistence helpers ─────────────────────────────────────────────────────

const SYNC_JOB_KEY = "sync:current_job";

/**
 * Persist job snapshot to PostgreSQL settings table.
 * Called after each major phase change so Vercel serverless invocations
 * that land on a different instance can read the current state.
 * Fire-and-forget (errors are non-fatal — in-memory state still works).
 */
async function saveJobToDb(job: SyncJob): Promise<void> {
  try {
    await db
      .insert(settingsTable)
      .values({ key: SYNC_JOB_KEY, value: job as unknown as Record<string, unknown> })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: {
          value: job as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    logger.warn({ err }, "Failed to persist sync job state to DB (non-fatal)");
  }
}

/**
 * Load job state from PostgreSQL settings table.
 * Used as fallback when currentJob is null (different serverless instance).
 */
async function loadJobFromDb(): Promise<SyncJob | null> {
  try {
    const rows = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, SYNC_JOB_KEY));
    if (!rows.length || !rows[0]) return null;
    return rows[0].value as unknown as SyncJob;
  } catch (err) {
    logger.warn({ err }, "Failed to load sync job state from DB");
    return null;
  }
}

function makeJob(): SyncJob {
  return {
    id: `sync_${Date.now()}`,
    status: "running",
    phase: "idle",
    message: "Initialising…",
    total: 0,
    processed: 0,
    currentBatch: 0,
    totalBatches: 0,
    cancelRequested: false,
    startedAt: Date.now(),
    report: {
      medicines: 0, companies: 0, categories: 0,
      drugGroups: 0, stockRecords: 0, parseErrors: 0,
      skipped: 0, durationMs: 0,
    },
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MEDICINE_BATCH = 500;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// ── Main importer ─────────────────────────────────────────────────────────────

async function runImport(
  job: SyncJob,
  buffers: {
    product: Buffer;
    stock: Buffer;
    company?: Buffer;
    category?: Buffer;
    drug?: Buffer;
  }
): Promise<void> {
  const t0 = Date.now();

  try {
    // ── 1. Parse ─────────────────────────────────────────────────────────────
    job.phase   = "parsing";
    job.message = "Parsing SDF files…";
    await saveJobToDb(job);

    const { medicines, allCategoryNames, allBrandNames, stats, parseErrors } =
      parseSdfBuffers(buffers);

    job.total               = medicines.length;
    job.report.parseErrors  = parseErrors;
    job.message = `Parsed ${medicines.length.toLocaleString()} products, ${stats.stock.toLocaleString()} stock records.`;

    logger.info({ ...stats, parseErrors }, "SDF parse complete");

    if (medicines.length === 0) {
      job.status  = "error";
      job.message = "No valid medicines found in PRODUCT.SDF. Check the file format.";
      await saveJobToDb(job);
      return;
    }

    if (job.cancelRequested) { job.status = "cancelled"; job.message = "Cancelled."; await saveJobToDb(job); return; }

    // ── 2. Upsert companies ───────────────────────────────────────────────────
    job.phase   = "companies";
    job.message = `Upserting ${allBrandNames.length} companies…`;
    await saveJobToDb(job);

    const uniqueCompanies = [...new Set(allBrandNames.filter(Boolean))];
    if (uniqueCompanies.length) {
      await db
        .insert(companiesTable)
        .values(uniqueCompanies.map((name) => ({ name })))
        .onConflictDoNothing();
    }

    const companyRows = await db.select().from(companiesTable);
    const companyNameToId = Object.fromEntries(companyRows.map((r) => [r.name, r.id]));
    job.report.companies = companyRows.length;
    job.message = `${uniqueCompanies.length} companies upserted.`;

    if (job.cancelRequested) { job.status = "cancelled"; job.message = "Cancelled."; await saveJobToDb(job); return; }

    // ── 3. Upsert categories ──────────────────────────────────────────────────
    job.phase   = "categories";
    job.message = `Upserting ${allCategoryNames.length} categories…`;
    await saveJobToDb(job);

    const uniqueCategories = [...new Set(allCategoryNames.filter(Boolean))];
    if (uniqueCategories.length) {
      await db
        .insert(categoriesTable)
        .values(
          uniqueCategories.map((name) => ({
            name,
            slug:        slugify(name),
            icon:        "💊",
            color:       "primary",
            enabled:     true,
            displayOrder: 0,
          }))
        )
        .onConflictDoNothing(); // preserve existing icon/color/enabled/order
    }

    const categoryRows = await db.select().from(categoriesTable);
    const categoryNameToId = Object.fromEntries(categoryRows.map((r) => [r.name, r.id]));
    job.report.categories = categoryRows.length;
    job.message = `${uniqueCategories.length} categories upserted.`;

    if (job.cancelRequested) { job.status = "cancelled"; job.message = "Cancelled."; await saveJobToDb(job); return; }

    // ── 4. Upsert drug groups (from unique genericNames) ──────────────────────
    job.phase   = "drug_groups";
    const uniqueGenerics = [...new Set(
      medicines.map((m) => m.description).filter((d): d is string => !!d && d.trim().length > 0)
    )];
    job.message = `Upserting ${uniqueGenerics.length} drug groups…`;
    await saveJobToDb(job);

    if (uniqueGenerics.length) {
      for (const batch of chunks(uniqueGenerics, 500)) {
        await db
          .insert(drugGroupsTable)
          .values(batch.map((name) => ({ name })))
          .onConflictDoNothing();
      }
    }

    const drugGroupRows = await db.select().from(drugGroupsTable);
    const drugGroupNameToId = Object.fromEntries(drugGroupRows.map((r) => [r.name, r.id]));
    job.report.drugGroups = drugGroupRows.length;
    job.message = `${uniqueGenerics.length} drug groups upserted.`;

    if (job.cancelRequested) { job.status = "cancelled"; job.message = "Cancelled."; await saveJobToDb(job); return; }

    // ── 5. Upsert medicines ───────────────────────────────────────────────────
    job.phase        = "medicines";
    job.totalBatches = Math.ceil(medicines.length / MEDICINE_BATCH);
    job.message      = `Importing ${medicines.length.toLocaleString()} medicines in ${job.totalBatches} batches…`;
    await saveJobToDb(job);

    const medBatches = chunks(medicines, MEDICINE_BATCH);
    const allInsertedIds: number[] = [];

    for (let i = 0; i < medBatches.length; i++) {
      if (job.cancelRequested) {
        job.status  = "cancelled";
        job.message = `Cancelled at batch ${i + 1}/${job.totalBatches}. ${job.processed} medicines imported.`;
        await saveJobToDb(job);
        return;
      }

      job.currentBatch = i + 1;
      job.message      = `Medicines: batch ${i + 1}/${job.totalBatches} (${job.processed.toLocaleString()}/${medicines.length.toLocaleString()})…`;

      const batch   = medBatches[i]!;
      const values  = batch.map((m) => ({
        productCode:          m.sdfProductId,
        name:                 m.name,
        genericName:          m.description || null,
        companyId:            companyNameToId[m.brand] ?? null,
        categoryId:           categoryNameToId[m.categoryName] ?? null,
        drugGroupId:          m.description ? (drugGroupNameToId[m.description] ?? null) : null,
        packing:              m.packInfo || null,
        mrp:                  m.mrp > 0   ? String(m.mrp)          : null,
        sellingPrice:         m.sellingPrice > 0 ? String(m.sellingPrice) : null,
        discount:             m.discount > 0  ? String(m.discount)    : null,
        prescriptionRequired: m.prescriptionRequired,
        stockStatus:          m.stockQty > 10 ? "in_stock" as const
                              : m.stockQty > 0 ? "low_stock" as const
                              : "out_of_stock" as const,
        stockQty:             m.stockQty,
        status:               (m.available && m.name !== "DELETED") ? "active" as const : "deleted" as const,
      }));

      const inserted = await db
        .insert(medicinesTable)
        .values(values)
        .onConflictDoUpdate({
          target: medicinesTable.productCode,
          set: {
            name:                 sql`excluded.name`,
            genericName:          sql`excluded.generic_name`,
            companyId:            sql`excluded.company_id`,
            categoryId:           sql`excluded.category_id`,
            drugGroupId:          sql`excluded.drug_group_id`,
            packing:              sql`excluded.packing`,
            mrp:                  sql`excluded.mrp`,
            sellingPrice:         sql`excluded.selling_price`,
            discount:             sql`excluded.discount`,
            prescriptionRequired: sql`excluded.prescription_required`,
            stockStatus:          sql`excluded.stock_status`,
            stockQty:             sql`excluded.stock_qty`,
            status:               sql`excluded.status`,
            updatedAt:            sql`now()`,
            // ⚠ featured / newArrival / special / imageUrl are intentionally
            //   NOT updated — those are admin-managed fields.
          },
        })
        .returning({ id: medicinesTable.id });

      for (const r of inserted) allInsertedIds.push(r.id);
      job.processed      += batch.length;
      job.report.medicines = job.processed;

      // Save progress to DB every 10 batches so polls see live progress
      // even if they land on a different serverless instance.
      if (i % 10 === 0) await saveJobToDb(job);
    }

    if (job.cancelRequested) { job.status = "cancelled"; await saveJobToDb(job); return; }

    // ── 6. Replace stock ──────────────────────────────────────────────────────
    job.phase   = "stock";
    job.message = `Writing stock records for ${allInsertedIds.length.toLocaleString()} medicines…`;
    await saveJobToDb(job);

    // Build productCode → medicine DB id map for stock writes
    const productCodeToDbId: Record<number, number> = {};
    const idRows = await db
      .select({ id: medicinesTable.id, productCode: medicinesTable.productCode })
      .from(medicinesTable)
      .where(inArray(medicinesTable.id, allInsertedIds.slice(0, 5000))); // guard huge INs

    for (const r of idRows) productCodeToDbId[r.productCode] = r.id;

    // Delete existing stock for all affected medicines then re-insert
    if (allInsertedIds.length > 0) {
      for (const idBatch of chunks(allInsertedIds, 1000)) {
        await db.delete(stockTable).where(inArray(stockTable.medicineId, idBatch));
      }
    }

    // One aggregated stock row per medicine
    const stockValues = medicines
      .map((m) => {
        const dbId = productCodeToDbId[m.sdfProductId];
        if (!dbId || m.stockQty <= 0) return null;
        return {
          medicineId:   dbId,
          quantity:     m.stockQty,
          sellingPrice: m.sellingPrice > 0 ? String(m.sellingPrice) : null,
          mrp:          m.mrp > 0          ? String(m.mrp)          : null,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);

    if (stockValues.length) {
      for (const batch of chunks(stockValues, 500)) {
        await db.insert(stockTable).values(batch);
      }
    }

    job.report.stockRecords = stockValues.length;

    // ── 7. Clean up orphaned categories ──────────────────────────────────────
    // Delete categories that have no medicines — these are leftover raw SDF
    // category names from before the normalizer was applied (e.g. "Allopathic",
    // "General"). After a fresh sync all valid categories have medicines; any
    // zero-count categories are stale and safe to remove.
    job.phase   = "done";
    job.message = "Cleaning up orphaned categories…";
    await saveJobToDb(job);

    try {
      const emptyCats = await db.execute(
        sql`DELETE FROM categories WHERE id NOT IN (
          SELECT DISTINCT category_id FROM medicines WHERE category_id IS NOT NULL
        ) RETURNING id, name`
      );
      const deletedNames = (emptyCats.rows as { name: string }[]).map((r) => r.name);
      if (deletedNames.length) {
        logger.info({ deleted: deletedNames }, "Removed orphaned categories after sync");
      }
    } catch (cleanupErr) {
      // Non-fatal: cleanup failure does not abort the import
      logger.warn({ cleanupErr }, "Category cleanup failed (non-fatal)");
    }

    // ── Done ──────────────────────────────────────────────────────────────────
    job.report.durationMs = Date.now() - t0;
    job.report.skipped    = medicines.length - job.report.medicines;
    job.status            = "done";
    job.phase             = "done";
    job.processed         = medicines.length;

    const sec = (job.report.durationMs / 1000).toFixed(1);
    job.message =
      `✅ Import complete in ${sec}s — ` +
      `${job.report.medicines.toLocaleString()} medicines, ` +
      `${job.report.companies} companies, ` +
      `${job.report.categories} categories, ` +
      `${job.report.drugGroups} drug groups, ` +
      `${job.report.stockRecords.toLocaleString()} stock records.`;

    logger.info({ report: job.report }, "SDF PostgreSQL import finished");
    await saveJobToDb(job);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "SDF PostgreSQL import crashed");
    job.status  = "error";
    job.phase   = "done";
    job.message = `Import failed: ${msg}`;
    await saveJobToDb(job);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/sync/status */
router.get(
  "/status",
  requireAuth,
  requireAdminEmail,
  async (_req: Request, res: Response): Promise<void> => {
    // Fast path: in-memory (Replit persistent process, same instance on Vercel)
    if (currentJob) {
      res.json({ running: currentJob.status === "running", job: currentJob });
      return;
    }
    // Fallback: read from DB (Vercel — status poll landed on a different instance)
    const dbJob = await loadJobFromDb();
    res.json({ running: dbJob?.status === "running", job: dbJob });
  }
);

/** POST /api/sync/upload — multipart SDF upload, starts background job */
router.post(
  "/upload",
  requireAuth,
  requireAdminEmail,
  (req: Request, res: Response, next) => { SDF_FIELDS(req, res, next); },
  async (req: Request, res: Response): Promise<void> => {
    if (currentJob?.status === "running") {
      res.status(409).json({
        error: "A sync is already running. Cancel it first or wait.",
        code: "already_running",
      });
      return;
    }

    // Also guard against a job running on another serverless instance
    const dbJob = await loadJobFromDb();
    if (dbJob?.status === "running") {
      res.status(409).json({
        error: "A sync is already running on another instance. Wait for it to finish.",
        code: "already_running",
      });
      return;
    }

    const files      = req.files as Record<string, Express.Multer.File[]> | undefined;
    const productFile = files?.["product_sdf"]?.[0];
    const stockFile   = files?.["stock_sdf"]?.[0];

    if (!productFile || !stockFile) {
      res.status(400).json({ error: "PRODUCT.SDF and STOCK.SDF are required.", code: "missing_files" });
      return;
    }

    const job   = makeJob();
    currentJob  = job;

    logger.info({ product: productFile.size, stock: stockFile.size }, "Starting PostgreSQL import job");

    // Persist initial state immediately so status polls see it right away
    await saveJobToDb(job);

    runImport(job, {
      product:  productFile.buffer,
      stock:    stockFile.buffer,
      company:  files?.["company_sdf"]?.[0]?.buffer,
      category: files?.["category_sdf"]?.[0]?.buffer,
      drug:     files?.["drug_sdf"]?.[0]?.buffer,
    }).catch((err) => {
      logger.error({ err }, "Import job crashed unexpectedly");
      if (currentJob) {
        currentJob.status  = "error";
        currentJob.message = err instanceof Error ? err.message : "Unknown error";
        void saveJobToDb(currentJob);
      }
    });

    res.status(202).json({
      jobId:   job.id,
      message: `Import started — ${productFile.size.toLocaleString()} byte product file received.`,
    });
  }
);

/** DELETE /api/sync/cancel */
router.delete(
  "/cancel",
  requireAuth,
  requireAdminEmail,
  async (_req: Request, res: Response): Promise<void> => {
    const job = currentJob ?? await loadJobFromDb();
    if (!job || job.status !== "running") {
      res.status(404).json({ error: "No running sync job to cancel." });
      return;
    }
    // Signal cancellation in both in-memory state and DB
    job.cancelRequested = true;
    if (currentJob) currentJob.cancelRequested = true;
    await saveJobToDb(job);
    res.json({ message: "Cancellation requested — job will stop after the current batch." });
  }
);

export default router;
