/**
 * GET  /api/settings/:key   — read a settings document (public)
 * PUT  /api/settings/:key   — upsert a settings document (admin only)
 *
 * Replaces Firestore "settings" collection docs: "store", "homepage", "announcement".
 * GET is intentionally public so the storefront can load announcement/homepage
 * config without requiring a signed-in user.
 */

import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

const ALLOWED_KEYS = new Set(["store", "homepage", "announcement"]);

// ── GET /api/settings/:key ────────────────────────────────────────────────────
router.get("/:key", async (req: Request, res: Response): Promise<void> => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) {
    res.status(404).json({ error: "Unknown settings key" });
    return;
  }
  try {
    const [row] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1);
    // Return the value object directly (or empty object if not yet set)
    res.json(row ? row.value : {});
  } catch (err) {
    logger.error({ err }, `GET /settings/${key} failed`);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// ── PUT /api/settings/:key ────────────────────────────────────────────────────
router.put(
  "/:key",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    const { key } = req.params;
    if (!ALLOWED_KEYS.has(key)) {
      res.status(404).json({ error: "Unknown settings key" });
      return;
    }
    const value = req.body as Record<string, unknown>;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      res.status(400).json({ error: "Request body must be a JSON object" });
      return;
    }
    try {
      const [row] = await db
        .insert(settingsTable)
        .values({ key, value, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: { value, updatedAt: new Date() },
        })
        .returning();
      res.json(row!.value);
    } catch (err) {
      logger.error({ err }, `PUT /settings/${key} failed`);
      res.status(500).json({ error: "Failed to save settings" });
    }
  }
);

export default router;
