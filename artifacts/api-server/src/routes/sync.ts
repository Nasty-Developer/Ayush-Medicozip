/**
 * Backend Inventory Sync — PostgreSQL Importer
 *
 * Replaces the Firestore-based importer entirely.
 * All medicine catalogue data is now stored in PostgreSQL.
 *
 * Upload flow (production-ready for Vercel):
 *  1. POST /api/sync/session          → create an upload session, receive sessionId
 *  2. POST /api/sync/chunk            → upload one ≤3 MB chunk per request
 *     (repeat for every chunk of every file)
 *  3. POST /api/sync/start            → assemble chunks + begin import (202)
 *  4. GET  /api/sync/status           → poll for live progress
 *  5. DELETE /api/sync/cancel         → request cancellation
 *
 * Why chunked? Vercel serverless functions have a hard 4.5 MB request body
 * limit that cannot be overridden in vercel.json. PRODUCT.SDF is ~24 MB.
 * Each chunk is ≤3 MB (well under the limit). Chunks are stored temporarily
 * in the upload_chunks PostgreSQL table, assembled in memory, then deleted
 * after the import starts.
 *
 * Job state is persisted to PostgreSQL (settings table, key "sync:current_job")
 * so that Vercel serverless invocations (which may land on different instances)
 * can all read/write the same job state.
 *
 * PostgreSQL upserts are idempotent (ON CONFLICT product_code DO UPDATE).
 * Re-importing the same files is safe — admin-managed flags (featured,
 * newArrival, special, imageUrl) are NEVER overwritten by the importer.
 *
 * Performance: ~13k medicines import in ~5–15 seconds with no throttling.
 * No Firestore is used or referenced anywhere in this file.
 */

import { randomUUID } from "crypto";
import { Router, type Request, type Response } from "express";
import multer from "multer";
import { sql, inArray, eq, and, gt, lte } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  companiesTable,
  categoriesTable,
  drugGroupsTable,
  medicinesTable,
  stockTable,
  settingsTable,
  syncSessionsTable,
  uploadChunksTable,
} from "@workspace/db";
import { logger } from "../lib/logger";
import {
  requireAuth,
  requireAdminEmail,
  type AuthenticatedRequest,
} from "../middlewares/authMiddleware";
import { parseSdfBuffers } from "../lib/sdf/parser";

const router = Router();

// ── Multer ────────────────────────────────────────────────────────────────────

/**
 * Chunk upload: accepts one "chunk" file field per request.
 * 4 MB limit gives headroom for the multipart envelope while staying well
 * under Vercel's 4.5 MB serverless body limit.
 */
const CHUNK_UPLOAD = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
}).single("chunk");

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
  sessionId: string;
  firebaseUid: string;
  ownerId: string;
  status: "running" | "done" | "cancelled" | "error";
  phase: JobPhase;
  message: string;
  total: number;
  processed: number;
  currentBatch: number;
  totalBatches: number;
  cancelRequested: boolean;
  startedAt: number;
  updatedAt: number;
  heartbeatAt: number;
  leaseExpiresAt: number;
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
const JOB_LEASE_MS = 5 * 60 * 1000;

class SyncLeaseLostError extends Error {
  constructor() {
    super("The inventory sync lease was claimed by another instance.");
    this.name = "SyncLeaseLostError";
  }
}

function parsePersistedJob(value: unknown): SyncJob | null {
  if (!value || typeof value !== "object") return null;
  return value as SyncJob;
}

function hasValidJobLease(job: SyncJob | null, now = Date.now()): boolean {
  return Boolean(
    job?.status === "running" &&
      Number.isFinite(job.leaseExpiresAt) &&
      job.leaseExpiresAt > now,
  );
}

function touchJobLease(job: SyncJob, now = Date.now()): void {
  job.updatedAt = now;
  job.heartbeatAt = now;
  job.leaseExpiresAt = job.status === "running" ? now + JOB_LEASE_MS : now;
}

/**
 * Persist job snapshot to PostgreSQL settings table.
 * Called after each major phase change and during the import heartbeat so
 * another instance can observe the current lease.
 *
 * The owner check is important: if this process loses its lease and another
 * instance recovers the job, the old process must not overwrite the new job
 * snapshot when it eventually finishes a database operation.
 */
async function saveJobToDb(job: SyncJob): Promise<boolean> {
  try {
    touchJobLease(job);
    const updated = await db
      .update(settingsTable)
      .set({
        value: job as unknown as Record<string, unknown>,
        updatedAt: new Date(job.updatedAt),
      })
      .where(
        and(
          eq(settingsTable.key, SYNC_JOB_KEY),
          sql`value->>'ownerId' = ${job.ownerId}`,
        ),
      )
      .returning({ key: settingsTable.key });

    if (updated.length > 0) return true;

    if (job.status === "running") {
      throw new SyncLeaseLostError();
    }

    logger.warn(
      { jobId: job.id, ownerId: job.ownerId, status: job.status },
      "Skipped persisting a terminal sync job after its lease was replaced",
    );
    return false;
  } catch (err) {
    if (err instanceof SyncLeaseLostError) throw err;
    logger.warn({ err }, "Failed to persist sync job state to DB (non-fatal)");
    return false;
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

/**
 * Atomically claim the single persisted import-job lease.
 *
 * The advisory transaction lock serializes claims across API instances.
 * Existing jobs without lease metadata are treated as stale for backwards
 * compatibility with the old permanently-running format.
 */
async function claimPersistedJobLease(job: SyncJob): Promise<{
  claimed: boolean;
  activeJob: SyncJob | null;
  staleJob: SyncJob | null;
}> {
  touchJobLease(job);

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${SYNC_JOB_KEY}, 0))`,
    );

    const rows = await tx.execute(
      sql`SELECT value FROM settings WHERE key = ${SYNC_JOB_KEY} FOR UPDATE`,
    );
    const row = rows.rows[0] as { value?: unknown } | undefined;
    const existingJob = parsePersistedJob(row?.value);

    if (hasValidJobLease(existingJob)) {
      return {
        claimed: false,
        activeJob: existingJob,
        staleJob: null,
      };
    }

    const staleJob =
      existingJob?.status === "running" ? existingJob : null;

    await tx
      .insert(settingsTable)
      .values({
        key: SYNC_JOB_KEY,
        value: job as unknown as Record<string, unknown>,
      })
      .onConflictDoUpdate({
        target: settingsTable.key,
        set: {
          value: job as unknown as Record<string, unknown>,
          updatedAt: new Date(job.updatedAt),
        },
      });

    return {
      claimed: true,
      activeJob: null,
      staleJob,
    };
  });
}

// Upload sessions are short-lived while files are being sent. Every accepted
// chunk renews this inactivity lease. Once the import starts, the longer
// running lease is renewed by the importer heartbeat below.
const UPLOADING_SESSION_TTL_MINUTES = 15;
const RUNNING_SESSION_TTL_HOURS = 2;
const RUNNING_SESSION_HEARTBEAT_INTERVAL_MS = 30 * 1000;
const ACTIVE_SESSION_STATUSES = ["uploading", "running"] as const;
type ActiveSessionStatus = (typeof ACTIVE_SESSION_STATUSES)[number];
type TerminalSessionStatus = "completed" | "failed" | "cancelled" | "expired";

function isActiveSessionStatus(status: string): status is ActiveSessionStatus {
  return status === "uploading" || status === "running";
}

function makeJob(sessionId: string, firebaseUid: string): SyncJob {
  const now = Date.now();
  return {
    id: `sync_${randomUUID()}`,
    sessionId,
    firebaseUid,
    ownerId: randomUUID(),
    status: "running",
    phase: "idle",
    message: "Initialising…",
    total: 0,
    processed: 0,
    currentBatch: 0,
    totalBatches: 0,
    cancelRequested: false,
    startedAt: now,
    updatedAt: now,
    heartbeatAt: now,
    leaseExpiresAt: now + JOB_LEASE_MS,
    report: {
      medicines: 0, companies: 0, categories: 0,
      drugGroups: 0, stockRecords: 0, parseErrors: 0,
      skipped: 0, durationMs: 0,
    },
  };
}

/**
 * Create one upload session per authenticated Firebase user.
 *
 * The advisory transaction lock closes the small race where two requests for
 * the same user arrive at the same time. Expiry cleanup, active-session
 * detection, and insertion all happen inside that same transaction using the
 * database clock. The partial unique index is the database-level backstop for
 * multiple API instances.
 */
async function createSyncSession(firebaseUid: string): Promise<
  | { sessionId: string }
  | { existing: { id: string; status: ActiveSessionStatus; expiresAt: Date } }
> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${firebaseUid}, 0))`,
    );

    // The data-modifying CTE is intentionally part of the same statement as
    // the active-session read. It retires expired rows before the partial
    // unique index is checked by the insert below. Uploading sessions created
    // before the inactivity lease was introduced may still have a legacy
    // expires_at far in the future, so their real deadline is updated_at plus
    // the current uploading inactivity lease.
    const activeRows = await tx.execute(sql`
      WITH expired AS (
        UPDATE sync_sessions
        SET
          status = 'expired',
          updated_at = CURRENT_TIMESTAMP,
          completed_at = CURRENT_TIMESTAMP,
          expires_at = CURRENT_TIMESTAMP
        WHERE firebase_uid = ${firebaseUid}
          AND status IN ('uploading', 'running')
          AND (
            (
              status = 'uploading'
              AND updated_at
                + (${UPLOADING_SESSION_TTL_MINUTES} * interval '1 minute')
                <= CURRENT_TIMESTAMP
            )
            OR (
              status = 'running'
              AND expires_at <= CURRENT_TIMESTAMP
            )
          )
        RETURNING id
      )
      SELECT id, status, expires_at
      FROM sync_sessions
      WHERE firebase_uid = ${firebaseUid}
        AND status IN ('uploading', 'running')
        AND (
          (
            status = 'uploading'
            AND updated_at
              + (${UPLOADING_SESSION_TTL_MINUTES} * interval '1 minute')
              > CURRENT_TIMESTAMP
          )
          OR (
            status = 'running'
            AND expires_at > CURRENT_TIMESTAMP
          )
        )
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `);

    const existingRow = activeRows.rows[0] as
      | { id?: unknown; status?: unknown; expires_at?: unknown }
      | undefined;
    const existingStatus =
      typeof existingRow?.status === "string" ? existingRow.status : "";
    const existingExpiresAt =
      existingRow?.expires_at instanceof Date
        ? existingRow.expires_at
        : new Date(String(existingRow?.expires_at ?? ""));

    if (
      typeof existingRow?.id === "string" &&
      isActiveSessionStatus(existingStatus) &&
      Number.isFinite(existingExpiresAt.getTime())
    ) {
      return {
        existing: {
          id: existingRow.id,
          status: existingStatus,
          expiresAt: existingExpiresAt,
        },
      };
    }

    const sessionId = randomUUID();
    await tx.execute(sql`
      INSERT INTO sync_sessions (id, firebase_uid, status, expires_at)
      VALUES (
        ${sessionId},
        ${firebaseUid},
        'uploading',
        CURRENT_TIMESTAMP + interval '15 minutes'
      )
    `);

    return { sessionId };
  });
}

async function loadOwnedSession(
  sessionId: string,
  firebaseUid: string,
  statuses: readonly ActiveSessionStatus[],
): Promise<{
  id: string;
  status: ActiveSessionStatus;
  expiresAt: Date;
} | null> {
  await db
    .update(syncSessionsTable)
    .set({
      status: "expired",
      updatedAt: sql`CURRENT_TIMESTAMP`,
      completedAt: sql`CURRENT_TIMESTAMP`,
      expiresAt: sql`CURRENT_TIMESTAMP`,
    })
    .where(
      and(
        eq(syncSessionsTable.id, sessionId),
        eq(syncSessionsTable.firebaseUid, firebaseUid),
        inArray(syncSessionsTable.status, [...statuses]),
        lte(syncSessionsTable.expiresAt, sql`CURRENT_TIMESTAMP`),
      ),
    );

  const rows = await db
    .select({
      id: syncSessionsTable.id,
      status: syncSessionsTable.status,
      expiresAt: syncSessionsTable.expiresAt,
    })
    .from(syncSessionsTable)
    .where(
      and(
        eq(syncSessionsTable.id, sessionId),
        eq(syncSessionsTable.firebaseUid, firebaseUid),
        inArray(syncSessionsTable.status, [...statuses]),
        gt(syncSessionsTable.expiresAt, sql`CURRENT_TIMESTAMP`),
      ),
    )
    .limit(1);

  const session = rows[0];
  return session && isActiveSessionStatus(session.status)
    ? {
        id: session.id,
        status: session.status,
        expiresAt: session.expiresAt,
      }
    : null;
}

async function storeChunkForSession(input: {
  sessionId: string;
  firebaseUid: string;
  fileKey: string;
  chunkIndex: number;
  totalChunks: number;
  data: Buffer;
}): Promise<boolean> {
  return db.transaction(async (tx) => {
    const activeSession = await tx
      .update(syncSessionsTable)
      .set({
        updatedAt: sql`CURRENT_TIMESTAMP`,
        expiresAt: sql`CURRENT_TIMESTAMP + interval '15 minutes'`,
      })
      .where(
        and(
          eq(syncSessionsTable.id, input.sessionId),
          eq(syncSessionsTable.firebaseUid, input.firebaseUid),
          eq(syncSessionsTable.status, "uploading"),
          gt(syncSessionsTable.expiresAt, sql`CURRENT_TIMESTAMP`),
        ),
      )
      .returning({ id: syncSessionsTable.id });

    if (!activeSession.length) return false;

    await tx
      .insert(uploadChunksTable)
      .values({
        sessionId: input.sessionId,
        fileKey: input.fileKey,
        chunkIndex: input.chunkIndex,
        totalChunks: input.totalChunks,
        data: input.data,
      })
      .onConflictDoUpdate({
        target: [
          uploadChunksTable.sessionId,
          uploadChunksTable.fileKey,
          uploadChunksTable.chunkIndex,
        ],
        set: { data: input.data, totalChunks: input.totalChunks },
      });

    return true;
  });
}

async function claimSyncSession(
  sessionId: string,
  firebaseUid: string,
): Promise<boolean> {
  const rows = await db
    .update(syncSessionsTable)
    .set({
      status: "running",
      startedAt: sql`CURRENT_TIMESTAMP`,
      updatedAt: sql`CURRENT_TIMESTAMP`,
      expiresAt: sql`CURRENT_TIMESTAMP + interval '2 hours'`,
    })
    .where(
      and(
        eq(syncSessionsTable.id, sessionId),
        eq(syncSessionsTable.firebaseUid, firebaseUid),
        eq(syncSessionsTable.status, "uploading"),
        gt(syncSessionsTable.expiresAt, sql`CURRENT_TIMESTAMP`),
      ),
    )
    .returning({ id: syncSessionsTable.id });

  return rows.length > 0;
}

/**
 * Keep a genuinely running import alive. The lease is deliberately renewed
 * from PostgreSQL so a long import cannot outlive its lock while still making
 * expired locks recoverable after an unexpected Vercel termination.
 */
async function refreshRunningSyncSessionLease(
  sessionId: string,
  firebaseUid: string,
): Promise<boolean> {
  const rows = await db
    .update(syncSessionsTable)
    .set({
      updatedAt: sql`CURRENT_TIMESTAMP`,
      expiresAt: sql`CURRENT_TIMESTAMP + interval '2 hours'`,
    })
    .where(
      and(
        eq(syncSessionsTable.id, sessionId),
        eq(syncSessionsTable.firebaseUid, firebaseUid),
        eq(syncSessionsTable.status, "running"),
        gt(syncSessionsTable.expiresAt, sql`CURRENT_TIMESTAMP`),
      ),
    )
    .returning({ id: syncSessionsTable.id });

  return rows.length > 0;
}

async function finishSyncSession(
  sessionId: string,
  firebaseUid: string,
  status: TerminalSessionStatus,
): Promise<void> {
  try {
    await db
      .update(syncSessionsTable)
      .set({
        status,
        updatedAt: sql`CURRENT_TIMESTAMP`,
        completedAt: sql`CURRENT_TIMESTAMP`,
        expiresAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(
        and(
          eq(syncSessionsTable.id, sessionId),
          eq(syncSessionsTable.firebaseUid, firebaseUid),
          inArray(syncSessionsTable.status, [...ACTIVE_SESSION_STATUSES]),
        ),
      );
  } catch (err) {
    logger.error({ err, sessionId, firebaseUid, status }, "Failed to release sync session lock");
  }
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

// ── Chunk assembly ─────────────────────────────────────────────────────────────

const VALID_FILE_KEYS = ["product_sdf", "stock_sdf", "company_sdf", "category_sdf", "drug_sdf"] as const;
type SdfFileKey = typeof VALID_FILE_KEYS[number];

/**
 * Read all chunks for a given session + fileKey from the database,
 * ordered by chunkIndex, and concatenate them into a single Buffer.
 * Returns null if no chunks are found for that fileKey.
 */
async function assembleFile(sessionId: string, fileKey: string): Promise<Buffer | null> {
  const rows = await db
    .select()
    .from(uploadChunksTable)
    .where(
      and(
        eq(uploadChunksTable.sessionId, sessionId),
        eq(uploadChunksTable.fileKey, fileKey),
      )
    )
    .orderBy(uploadChunksTable.chunkIndex);

  if (!rows.length) return null;
  return Buffer.concat(rows.map((r) => r.data));
}

/**
 * Delete all chunks for a session — called after import starts (or on abort).
 */
async function cleanupSession(sessionId: string): Promise<void> {
  try {
    await db
      .delete(uploadChunksTable)
      .where(eq(uploadChunksTable.sessionId, sessionId));
  } catch (err) {
    logger.warn({ err, sessionId }, "Failed to clean up upload session chunks (non-fatal)");
  }
}

/**
 * Prune upload_chunks rows older than 24 hours.
 * Called on server startup so stale chunks from crashed sessions are removed.
 */
async function pruneStaleChunks(): Promise<void> {
  try {
    await db.execute(
      sql`DELETE FROM upload_chunks WHERE created_at < now() - interval '24 hours'`
    );
  } catch { /* non-fatal */ }
}

// Prune on startup (fire-and-forget)
void pruneStaleChunks();

// ── Main importer ─────────────────────────────────────────────────────────────

async function runImport(
  job: SyncJob,
  buffers: {
    product: Buffer;
    stock: Buffer;
    company?: Buffer;
    category?: Buffer;
    drug?: Buffer;
  },
  session: { id: string; firebaseUid: string },
): Promise<void> {
  const t0 = Date.now();
  let terminalSessionStatus: TerminalSessionStatus = "failed";
  let lastSessionHeartbeatAt = 0;

  const refreshRunningLeaseIfDue = async (force = false): Promise<void> => {
    const now = Date.now();
    if (
      !force &&
      now - lastSessionHeartbeatAt < RUNNING_SESSION_HEARTBEAT_INTERVAL_MS
    ) {
      return;
    }

    if (!(await refreshRunningSyncSessionLease(session.id, session.firebaseUid))) {
      throw new SyncLeaseLostError();
    }
    lastSessionHeartbeatAt = now;
  };

  try {
    await refreshRunningLeaseIfDue(true);

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

    if (job.cancelRequested) {
      terminalSessionStatus = "cancelled";
      job.status = "cancelled";
      job.message = "Cancelled.";
      await saveJobToDb(job);
      return;
    }

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

    if (job.cancelRequested) {
      terminalSessionStatus = "cancelled";
      job.status = "cancelled";
      job.message = "Cancelled.";
      await saveJobToDb(job);
      return;
    }

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

    if (job.cancelRequested) {
      terminalSessionStatus = "cancelled";
      job.status = "cancelled";
      job.message = "Cancelled.";
      await saveJobToDb(job);
      return;
    }

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
        await refreshRunningLeaseIfDue();
      }
    }

    const drugGroupRows = await db.select().from(drugGroupsTable);
    const drugGroupNameToId = Object.fromEntries(drugGroupRows.map((r) => [r.name, r.id]));
    job.report.drugGroups = drugGroupRows.length;
    job.message = `${uniqueGenerics.length} drug groups upserted.`;

    if (job.cancelRequested) {
      terminalSessionStatus = "cancelled";
      job.status = "cancelled";
      job.message = "Cancelled.";
      await saveJobToDb(job);
      return;
    }

    // ── 5. Upsert medicines ───────────────────────────────────────────────────
    job.phase        = "medicines";
    job.totalBatches = Math.ceil(medicines.length / MEDICINE_BATCH);
    job.message      = `Importing ${medicines.length.toLocaleString()} medicines in ${job.totalBatches} batches…`;
    await saveJobToDb(job);

    const medBatches = chunks(medicines, MEDICINE_BATCH);
    const allInsertedIds: number[] = [];

    for (let i = 0; i < medBatches.length; i++) {
      if (job.cancelRequested) {
        terminalSessionStatus = "cancelled";
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
      await refreshRunningLeaseIfDue();

      // Save progress to DB every 10 batches so polls see live progress
      // even if they land on a different serverless instance.
      if (i % 10 === 0) {
        await saveJobToDb(job);
      }
    }

    if (job.cancelRequested) {
      terminalSessionStatus = "cancelled";
      job.status = "cancelled";
      await saveJobToDb(job);
      return;
    }

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
        await refreshRunningLeaseIfDue();
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
        await refreshRunningLeaseIfDue();
      }
    }

    job.report.stockRecords = stockValues.length;

    // ── 7. Clean up orphaned categories ──────────────────────────────────────
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
    terminalSessionStatus = "completed";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "SDF PostgreSQL import crashed");
    job.status  = "error";
    job.phase   = "done";
    job.message = `Import failed: ${msg}`;
    await saveJobToDb(job);
  } finally {
    await finishSyncSession(session.id, session.firebaseUid, terminalSessionStatus);
    logger.info(
      {
        sessionId: session.id,
        firebaseUid: session.firebaseUid,
        status: terminalSessionStatus,
      },
      "Inventory sync session released",
    );
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

/**
 * POST /api/sync/session
 *
 * Creates a new upload session and returns a sessionId.
 * The sessionId is a correlation key used by subsequent /chunk requests
 * and the final /start request to identify which chunks belong together.
 *
 * Body: none required.
 * Response: { sessionId: string }
 */
router.post(
  "/session",
  requireAuth,
  requireAdminEmail,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      res.status(401).json({ error: "Authenticated Firebase user is required." });
      return;
    }

    try {
      const result = await createSyncSession(firebaseUid);
      if ("existing" in result) {
        const retryAt = result.existing.expiresAt.toISOString();
        logger.warn(
          {
            firebaseUid,
            sessionId: result.existing.id,
            status: result.existing.status,
            retryAt,
          },
          "Sync session creation rejected because an active session already exists",
        );
        res.status(409).json({
          error: "A sync is already in progress for this user.",
          code: "sync_session_already_active",
          sessionId: result.existing.id,
          status: result.existing.status,
          retryAt,
        });
        return;
      }

      logger.info(
        {
          firebaseUid,
          sessionId: result.sessionId,
          uploadingLeaseMinutes: UPLOADING_SESSION_TTL_MINUTES,
          runningLeaseHours: RUNNING_SESSION_TTL_HOURS,
          heartbeatIntervalSeconds: RUNNING_SESSION_HEARTBEAT_INTERVAL_MS / 1000,
        },
        "Sync upload session created",
      );
      res.json({ sessionId: result.sessionId });
    } catch (err) {
      logger.error({ err, firebaseUid }, "Failed to create sync upload session");
      res.status(500).json({
        error: "Failed to create sync upload session.",
        code: "sync_session_creation_error",
      });
    }
  }
);

/**
 * POST /api/sync/chunk
 *
 * Receives one chunk of an SDF file and stores it in PostgreSQL.
 * Designed to stay under Vercel's 4.5 MB body limit (chunks are ≤3 MB).
 *
 * Multipart fields:
 *   chunk       — binary file data (the raw bytes for this slice)
 *   sessionId   — session UUID from POST /api/sync/session
 *   fileKey     — one of: product_sdf | stock_sdf | company_sdf | category_sdf | drug_sdf
 *   chunkIndex  — 0-based index of this chunk
 *   totalChunks — total number of chunks for this file
 *
 * Response: { received: true, sessionId, fileKey, chunkIndex, totalChunks }
 */
router.post(
  "/chunk",
  requireAuth,
  requireAdminEmail,
  (req: Request, res: Response, next) => { CHUNK_UPLOAD(req, res, next); },
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { sessionId, fileKey, chunkIndex, totalChunks } = req.body as {
      sessionId: string;
      fileKey: string;
      chunkIndex: string;
      totalChunks: string;
    };

    // Validate inputs
    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "sessionId is required", code: "missing_session_id" });
      return;
    }
    if (!VALID_FILE_KEYS.includes(fileKey as SdfFileKey)) {
      res.status(400).json({ error: `Invalid fileKey. Must be one of: ${VALID_FILE_KEYS.join(", ")}`, code: "invalid_file_key" });
      return;
    }
    const idx   = parseInt(chunkIndex, 10);
    const total = parseInt(totalChunks, 10);
    if (isNaN(idx) || isNaN(total) || idx < 0 || total < 1 || idx >= total) {
      res.status(400).json({ error: "Invalid chunkIndex or totalChunks", code: "invalid_chunk_params" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "No chunk data received. Send binary data in the 'chunk' field.", code: "missing_chunk" });
      return;
    }

    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      res.status(401).json({ error: "Authenticated Firebase user is required." });
      return;
    }

    const fileName = req.file.originalname || fileKey;
    logger.info(
      {
        firebaseUid,
        sessionId,
        fileName,
        fileKey,
        chunkIndex: idx,
        chunkCount: total,
        bytes: req.file.size,
      },
      "Sync chunk upload started",
    );

    try {
      const stored = await storeChunkForSession({
        sessionId,
        firebaseUid,
        fileKey,
        chunkIndex: idx,
        totalChunks: total,
        data: req.file.buffer,
      });

      if (!stored) {
        logger.warn(
          { firebaseUid, sessionId, fileName, fileKey, chunkIndex: idx, chunkCount: total },
          "Sync chunk rejected because the upload session is not active or owned by the user",
        );
        res.status(409).json({
          error: "This sync session is no longer active. Start a new sync.",
          code: "sync_session_inactive",
        });
        return;
      }

      logger.info(
        {
          firebaseUid,
          sessionId,
          fileName,
          fileKey,
          chunkIndex: idx,
          chunkCount: total,
          bytes: req.file.size,
        },
        "Sync chunk upload completed",
      );
      res.json({ received: true, sessionId, fileKey, chunkIndex: idx, totalChunks: total });
    } catch (err) {
      logger.error(
        { err, firebaseUid, sessionId, fileName, fileKey, chunkIndex: idx, chunkCount: total },
        "Sync chunk upload failed",
      );
      res.status(500).json({ error: "Failed to store chunk", code: "chunk_store_error" });
    }
  }
);

/**
 * POST /api/sync/start
 *
 * Assembles all uploaded chunks for the session from PostgreSQL,
 * validates required files are present, kicks off the import job (202),
 * and deletes the temporary chunks.
 *
 * Body (JSON): { sessionId: string }
 * Response: { jobId: string, message: string }
 */
router.post(
  "/start",
  requireAuth,
  requireAdminEmail,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { sessionId } = req.body as { sessionId?: string };

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "sessionId is required", code: "missing_session_id" });
      return;
    }

    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      res.status(401).json({ error: "Authenticated Firebase user is required." });
      return;
    }

    const session = await loadOwnedSession(sessionId, firebaseUid, ["uploading"]);
    if (!session) {
      res.status(409).json({
        error: "This sync session is no longer active. Start a new sync.",
        code: "sync_session_inactive",
      });
      return;
    }

    if (hasValidJobLease(currentJob)) {
      res.status(409).json({
        error: "A sync is already running. Cancel it first or wait.",
        code: "already_running",
      });
      return;
    }

    // Claim the upload session before assembling files. This makes duplicate
    // /start requests harmless and changes the lock state atomically.
    const claimed = await claimSyncSession(sessionId, firebaseUid);
    if (!claimed) {
      res.status(409).json({
        error: "This sync session has already started. Wait for it to finish.",
        code: "sync_session_already_started",
      });
      return;
    }

    let productBuf: Buffer | null;
    let stockBuf: Buffer | null;
    let companyBuf: Buffer | undefined;
    let categoryBuf: Buffer | undefined;
    let drugBuf: Buffer | undefined;

    try {
      // Assemble required and optional files
      productBuf = await assembleFile(sessionId, "product_sdf");
      stockBuf = await assembleFile(sessionId, "stock_sdf");
      companyBuf = await assembleFile(sessionId, "company_sdf") ?? undefined;
      categoryBuf = await assembleFile(sessionId, "category_sdf") ?? undefined;
      drugBuf = await assembleFile(sessionId, "drug_sdf") ?? undefined;
    } catch (err) {
      await finishSyncSession(sessionId, firebaseUid, "failed");
      void cleanupSession(sessionId);
      logger.error({ err, firebaseUid, sessionId }, "Failed to assemble sync session files");
      res.status(500).json({
        error: "Failed to assemble uploaded sync files.",
        code: "sync_assembly_error",
      });
      return;
    }

    if (!productBuf) {
      await finishSyncSession(sessionId, firebaseUid, "failed");
      void cleanupSession(sessionId);
      res.status(400).json({ error: "PRODUCT.SDF chunks not found for this session. Re-upload the file.", code: "missing_product" });
      return;
    }
    if (!stockBuf) {
      await finishSyncSession(sessionId, firebaseUid, "failed");
      void cleanupSession(sessionId);
      res.status(400).json({ error: "STOCK.SDF chunks not found for this session. Re-upload the file.", code: "missing_stock" });
      return;
    }

    const job = makeJob(sessionId, firebaseUid);
    const persistedLease = await claimPersistedJobLease(job);
    if (!persistedLease.claimed) {
      await finishSyncSession(sessionId, firebaseUid, "failed");
      void cleanupSession(sessionId);
      res.status(409).json({
        error: "A sync is already running on another instance. Wait for it to finish.",
        code: "already_running",
      });
      return;
    }

    currentJob = job;

    logger.info(
      {
        firebaseUid,
        sessionId,
        product:  productBuf.length,
        stock:    stockBuf.length,
        company:  companyBuf?.length,
        category: categoryBuf?.length,
        drug:     drugBuf?.length,
      },
      "Starting PostgreSQL import job from assembled chunks"
    );

    // Persist initial state immediately so status polls see it right away
    await saveJobToDb(job);

    // Clean up chunks after handing off buffers (fire-and-forget)
    void cleanupSession(sessionId);

    runImport(job, {
      product:  productBuf,
      stock:    stockBuf,
      company:  companyBuf,
      category: categoryBuf,
      drug:     drugBuf,
    }, {
      id: sessionId,
      firebaseUid,
    }).catch((err) => {
      logger.error({ err }, "Import job crashed unexpectedly");
      if (currentJob) {
        currentJob.status  = "error";
        currentJob.message = err instanceof Error ? err.message : "Unknown error";
        void saveJobToDb(currentJob);
      }
      void finishSyncSession(sessionId, firebaseUid, "failed");
    });

    res.status(202).json({
      jobId:   job.id,
      message: `Import started — ${productBuf.length.toLocaleString()} byte product file assembled from chunks.`,
    });
  }
);

/** DELETE /api/sync/cancel */
router.delete(
  "/cancel",
  requireAuth,
  requireAdminEmail,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      res.status(401).json({ error: "Authenticated Firebase user is required." });
      return;
    }

    const { sessionId } = (req.body ?? {}) as { sessionId?: string };
    const job = currentJob ?? await loadJobFromDb();
    const requestedSessionId = sessionId ?? job?.sessionId;

    if (requestedSessionId) {
      const session = await loadOwnedSession(
        requestedSessionId,
        firebaseUid,
        ["uploading", "running"],
      );

      if (!session) {
        res.status(404).json({ error: "No active sync session found." });
        return;
      }

      if (
        session.status === "running" &&
        job?.status === "running" &&
        job.sessionId === requestedSessionId
      ) {
        // Signal cancellation in both in-memory state and DB. runImport's
        // finally block releases the session lock after the current batch.
        job.cancelRequested = true;
        if (currentJob) currentJob.cancelRequested = true;
        await saveJobToDb(job);
        logger.info(
          { firebaseUid, sessionId: requestedSessionId },
          "Inventory sync cancellation requested",
        );
        res.json({ message: "Cancellation requested — sync will stop after the current batch." });
        return;
      }

      await finishSyncSession(requestedSessionId, firebaseUid, "cancelled");
      await cleanupSession(requestedSessionId);
      logger.info(
        { firebaseUid, sessionId: requestedSessionId },
        "Upload-only sync session cancelled and released",
      );
      res.json({ message: "Sync session cancelled." });
      return;
    }

    if (!job || job.status !== "running") {
      res.status(404).json({ error: "No active sync job to cancel." });
      return;
    }

    job.cancelRequested = true;
    if (currentJob) currentJob.cancelRequested = true;
    await saveJobToDb(job);
    res.json({ message: "Cancellation requested — sync will stop after the current batch." });
  }
);

export default router;
