import { Router, type Request, type Response } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

const CRITICAL_TABLES = ["orders", "order_items", "medicines", "users", "addresses", "admin_users"];

type DbProbe = {
  connected: boolean;
  error: string | null;
  missingTables: string[];
  presentTables: string[];
};

async function probeDatabase(): Promise<DbProbe> {
  try {
    await pool.query("SELECT 1");
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    logger.error({ err }, "Health check: database connection failed");
    return {
      connected: false,
      error: code ? `connection_failed:${code}` : "connection_failed",
      missingTables: [],
      presentTables: [],
    };
  }

  try {
    const { rows } = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [CRITICAL_TABLES],
    );
    const present = new Set(rows.map((row) => row.table_name));
    return {
      connected: true,
      error: null,
      presentTables: CRITICAL_TABLES.filter((table) => present.has(table)),
      missingTables: CRITICAL_TABLES.filter((table) => !present.has(table)),
    };
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    logger.error({ err }, "Health check: schema probe failed");
    return {
      connected: true,
      error: code ? `schema_probe_failed:${code}` : "schema_probe_failed",
      missingTables: [],
      presentTables: [],
    };
  }
}

/**
 * Liveness + a small, secret-free database probe. The panel and the storefront
 * both surface real failures, so this endpoint answers the first support
 * question ("is the database reachable and does it have our tables?") without
 * needing access to the hosting dashboard.
 */
router.get("/healthz", async (_req: Request, res: Response): Promise<void> => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  const database = await probeDatabase();
  const healthy = database.connected && database.missingTables.length === 0 && !database.error;

  res.status(200).json({
    ...data,
    ok: healthy,
    database,
  });
});

export default router;
