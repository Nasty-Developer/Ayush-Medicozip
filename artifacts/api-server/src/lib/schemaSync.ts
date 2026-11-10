import { getTableConfig } from "drizzle-orm/pg-core";
import { pool } from "@workspace/db";
import * as schema from "@workspace/db/schema";
import { logger } from "./logger.js";

/**
 * Additive, idempotent reconciliation between the Drizzle schema in code and the
 * live PostgreSQL database.
 *
 * Production drifted behind the code: the deployed server selects columns such
 * as `addresses.delivery_instructions` that the running database never received,
 * so every authenticated address request failed with
 * `column "delivery_instructions" does not exist`.
 *
 * Everything here is `IF NOT EXISTS` / additive only. No column, row or table is
 * ever dropped or rewritten, so existing customer data is untouched.
 */
const IDEMPOTENT_DDL: string[] = [
  `CREATE TABLE IF NOT EXISTS addresses (
     id serial PRIMARY KEY,
     user_id uuid REFERENCES users(id) ON DELETE CASCADE,
     full_name text,
     mobile_number text,
     alternate_number text,
     house_number text,
     building_name text,
     street text,
     area text,
     landmark text,
     delivery_instructions text,
     pincode text,
     city text DEFAULT 'Mumbai',
     state text DEFAULT 'Maharashtra',
     address_type text DEFAULT 'home',
     is_default boolean DEFAULT false,
     lat numeric(10, 6),
     lng numeric(10, 6),
     created_at timestamp DEFAULT now() NOT NULL,
     updated_at timestamp DEFAULT now() NOT NULL
   )`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS alternate_number text`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS building_name text`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS area text`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS landmark text`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS delivery_instructions text`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS lat numeric(10, 6)`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS lng numeric(10, 6)`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS city text DEFAULT 'Mumbai'`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS state text DEFAULT 'Maharashtra'`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS address_type text DEFAULT 'home'`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()`,
  `ALTER TABLE addresses ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT now()`,
  // 20261026_allow_email_less_users.sql: phone-only customers have no email claim.
  `ALTER TABLE users ALTER COLUMN email DROP NOT NULL`,
  // Admin access registry: lets the owner add staff without rebuilding the
  // frontend bundle (the allowlist used to live in VITE_ADMIN_EMAIL).
  `CREATE TABLE IF NOT EXISTS admin_users (
     id serial PRIMARY KEY,
     firebase_uid text UNIQUE,
     email text NOT NULL UNIQUE,
     display_name text,
     role text DEFAULT 'admin' NOT NULL,
     is_active boolean DEFAULT true NOT NULL,
     last_login_at timestamp,
     created_at timestamp DEFAULT now() NOT NULL,
     updated_at timestamp DEFAULT now() NOT NULL
   )`,
  // An admin is added by email before they ever sign in, so the uid is
  // optional until their first login.
  `ALTER TABLE admin_users ALTER COLUMN firebase_uid DROP NOT NULL`,
];

export async function ensureSchema(): Promise<void> {
  let applied = 0;
  let failed = 0;

  for (const statement of IDEMPOTENT_DDL) {
    try {
      await pool.query(statement);
      applied += 1;
    } catch (err) {
      failed += 1;
      logger.warn({ err, statement }, "Schema reconciliation statement failed");
    }
  }

  logger.info({ applied, failed }, "Schema reconciliation completed");
}

type DriftReport = {
  missingTables: string[];
  missingColumns: Record<string, string[]>;
};

/**
 * Compares every table in the Drizzle schema with information_schema so a
 * deploy that needs an unreleased column is visible in the logs immediately
 * instead of surfacing as a customer-facing 500.
 */
export async function reportSchemaDrift(): Promise<DriftReport> {
  const expected = new Map<string, string[]>();

  for (const value of Object.values(schema)) {
    if (!value || typeof value !== "object") continue;
    try {
      const config = getTableConfig(value as never);
      if (!config?.name) continue;
      expected.set(config.name, config.columns.map((column) => column.name));
    } catch {
      // Not a table export (enums, types, helpers).
    }
  }

  const tableNames = [...expected.keys()];
  if (tableNames.length === 0) return { missingTables: [], missingColumns: {} };

  const { rows } = await pool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
    [tableNames],
  );

  const actual = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!actual.has(row.table_name)) actual.set(row.table_name, new Set());
    actual.get(row.table_name)!.add(row.column_name);
  }

  const missingTables: string[] = [];
  const missingColumns: Record<string, string[]> = {};

  for (const [table, columns] of expected) {
    const present = actual.get(table);
    if (!present) {
      missingTables.push(table);
      continue;
    }
    const missing = columns.filter((column) => !present.has(column));
    if (missing.length > 0) missingColumns[table] = missing;
  }

  const report = { missingTables, missingColumns };
  if (missingTables.length > 0 || Object.keys(missingColumns).length > 0) {
    logger.warn(report, "Database schema is behind the code");
  } else {
    logger.info({ tables: tableNames.length }, "Database schema matches the code");
  }
  return report;
}
