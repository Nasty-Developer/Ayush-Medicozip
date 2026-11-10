import app from "./app.js";
import { logger } from "./lib/logger.js";
import { ensureSchema, reportSchemaDrift } from "./lib/schemaSync.js";
import { refreshAdminCache } from "./lib/adminAccounts.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

/**
 * Reconcile the additive schema and report any remaining drift before serving
 * traffic. A database problem must never stop the API from booting: the routes
 * already return a clear 503 for an unavailable database.
 */
async function main(): Promise<void> {
  try {
    await ensureSchema();
  } catch (err) {
    logger.error({ err }, "Schema reconciliation could not run");
  }

  try {
    await reportSchemaDrift();
  } catch (err) {
    logger.error({ err }, "Schema drift check could not run");
  }

  // Admin access is decided by the admin_users table, so warm the snapshot
  // before serving traffic and keep it fresh for multi-instance deploys.
  try {
    await refreshAdminCache({ force: true });
  } catch (err) {
    logger.error({ err }, "Admin account cache could not be loaded");
  }

  const adminCacheTimer = setInterval(() => {
    void refreshAdminCache();
  }, 60_000);
  adminCacheTimer.unref();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

void main();
