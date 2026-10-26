/**
 * Veterinary Medicines API
 *
 * Public endpoints (no auth):
 *   GET  /api/vet-medicines            → paginated list (active only)
 *   GET  /api/vet-medicines/categories → vet categories with counts
 *   GET  /api/vet-medicines/:id        → single item
 *
 * Admin endpoints (Firebase auth required):
 *   GET    /api/vet-medicines/admin    → paginated list (all statuses)
 *   POST   /api/vet-medicines          → create
 *   PUT    /api/vet-medicines/:id      → update
 *   DELETE /api/vet-medicines/:id      → soft-delete (status → deleted)
 */

import { Router, type Request, type Response } from "express";
import { getTableColumns, eq, ilike, or, and, asc, desc, count, sql, type SQL } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  vetMedicinesTable, categoriesTable,
  type InsertVetMedicine,
} from "@workspace/db";
import { logger } from "../lib/logger.js";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware.js";

const router = Router();

function paginate(req: Request) {
  const page  = Math.max(1, parseInt(String(req.query["page"]  ?? "1"),   10));
  const limit = Math.min(200, parseInt(String(req.query["limit"] ?? "50"), 10));
  return { page, limit, offset: (page - 1) * limit };
}

// ── GET /categories (public) ──────────────────────────────────────────────────
// Must be before /:id to avoid "categories" being captured as an id.
router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        ...getTableColumns(categoriesTable),
        count: sql<number>`cast(count(${vetMedicinesTable.id}) as int)`,
      })
      .from(categoriesTable)
      .leftJoin(
        vetMedicinesTable,
        and(
          eq(vetMedicinesTable.categoryId, categoriesTable.id),
          eq(vetMedicinesTable.status, "active"),
        ),
      )
      .where(
        and(
          eq(categoriesTable.enabled, true),
          eq(categoriesTable.collectionType, "veterinary"),
        ),
      )
      .groupBy(categoriesTable.id)
      .orderBy(asc(categoriesTable.displayOrder), asc(categoriesTable.name));

    res.json({ data: rows });
  } catch (err) {
    logger.error({ err }, "GET /vet-medicines/categories failed");
    res.status(500).json({ error: "Failed to fetch vet categories" });
  }
});

// ── GET /admin (auth – all statuses, paginated) ───────────────────────────────
router.get("/admin", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, offset } = paginate(req);
    const { search, categoryId } = req.query;

    const conditions: SQL[] = [];
    if (categoryId) conditions.push(eq(vetMedicinesTable.categoryId, Number(categoryId)));
    if (search) {
      conditions.push(
        or(
          ilike(vetMedicinesTable.name,        `%${search}%`),
          ilike(vetMedicinesTable.brand,       `%${search}%`),
          ilike(vetMedicinesTable.genericName, `%${search}%`),
        ) as SQL,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [totalRow]] = await Promise.all([
      db.select({
        ...getTableColumns(vetMedicinesTable),
        categoryName: categoriesTable.name,
      })
        .from(vetMedicinesTable)
        .leftJoin(categoriesTable, eq(vetMedicinesTable.categoryId, categoriesTable.id))
        .where(where)
        .orderBy(desc(vetMedicinesTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(vetMedicinesTable).where(where ?? sql`true`),
    ]);

    res.json({ data: rows, total: totalRow?.count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "GET /vet-medicines/admin failed");
    res.status(500).json({ error: "Failed to fetch vet medicines" });
  }
});

// ── GET / (public – active only) ──────────────────────────────────────────────
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, offset } = paginate(req);
    const { search, categoryId, animalType, featured } = req.query;

    const conditions: SQL[] = [eq(vetMedicinesTable.status, "active")];
    if (categoryId)  conditions.push(eq(vetMedicinesTable.categoryId, Number(categoryId)));
    if (animalType)  conditions.push(eq(vetMedicinesTable.animalType, String(animalType)));
    if (featured === "true") conditions.push(eq(vetMedicinesTable.featured, true));
    if (search) {
      conditions.push(
        or(
          ilike(vetMedicinesTable.name,        `%${search}%`),
          ilike(vetMedicinesTable.brand,       `%${search}%`),
          ilike(vetMedicinesTable.genericName, `%${search}%`),
        ) as SQL,
      );
    }

    const where = and(...conditions);

    const [rows, [totalRow]] = await Promise.all([
      db.select({
        ...getTableColumns(vetMedicinesTable),
        categoryName: categoriesTable.name,
      })
        .from(vetMedicinesTable)
        .leftJoin(categoriesTable, eq(vetMedicinesTable.categoryId, categoriesTable.id))
        .where(where)
        .orderBy(asc(vetMedicinesTable.name))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(vetMedicinesTable).where(where),
    ]);

    res.json({ data: rows, total: totalRow?.count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "GET /vet-medicines failed");
    res.status(500).json({ error: "Failed to fetch vet medicines" });
  }
});

// ── GET /:id (public) ─────────────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db
      .select({ ...getTableColumns(vetMedicinesTable), categoryName: categoriesTable.name })
      .from(vetMedicinesTable)
      .leftJoin(categoriesTable, eq(vetMedicinesTable.categoryId, categoriesTable.id))
      .where(and(eq(vetMedicinesTable.id, id), eq(vetMedicinesTable.status, "active")));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    logger.error({ err }, "GET /vet-medicines/:id failed");
    res.status(500).json({ error: "Failed to fetch vet medicine" });
  }
});

// ── POST / (admin) ────────────────────────────────────────────────────────────
router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as InsertVetMedicine;
    if (!data.name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
    const [created] = await db.insert(vetMedicinesTable).values(data).returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "POST /vet-medicines failed");
    res.status(500).json({ error: "Failed to create vet medicine" });
  }
});

// ── PUT /:id (admin) ──────────────────────────────────────────────────────────
router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(vetMedicinesTable)
      .set({ ...(req.body as Partial<InsertVetMedicine>), updatedAt: new Date() })
      .where(eq(vetMedicinesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /vet-medicines/:id failed");
    res.status(500).json({ error: "Failed to update vet medicine" });
  }
});

// ── DELETE /:id (admin – soft delete) ────────────────────────────────────────
router.delete("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db
      .update(vetMedicinesTable)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(vetMedicinesTable.id, id))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /vet-medicines/:id failed");
    res.status(500).json({ error: "Failed to delete vet medicine" });
  }
});

export default router;
