/**
 * General Healthcare Products API
 *
 * Public endpoints (no auth):
 *   GET  /api/general-products            → paginated list (active only)
 *   GET  /api/general-products/categories → general categories with counts
 *   GET  /api/general-products/:id        → single item
 *
 * Admin endpoints (Firebase auth required):
 *   GET    /api/general-products/admin    → paginated list (all statuses)
 *   POST   /api/general-products          → create
 *   PUT    /api/general-products/:id      → update
 *   DELETE /api/general-products/:id      → soft-delete (status → deleted)
 */

import { Router, type Request, type Response } from "express";
import { getTableColumns, eq, ilike, or, and, asc, desc, count, sql, type SQL } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  generalProductsTable, categoriesTable,
  type InsertGeneralProduct,
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
router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        ...getTableColumns(categoriesTable),
        count: sql<number>`cast(count(${generalProductsTable.id}) as int)`,
      })
      .from(categoriesTable)
      .leftJoin(
        generalProductsTable,
        and(
          eq(generalProductsTable.categoryId, categoriesTable.id),
          eq(generalProductsTable.status, "active"),
        ),
      )
      .where(
        and(
          eq(categoriesTable.enabled, true),
          eq(categoriesTable.collectionType, "general"),
        ),
      )
      .groupBy(categoriesTable.id)
      .orderBy(asc(categoriesTable.displayOrder), asc(categoriesTable.name));

    res.json({ data: rows });
  } catch (err) {
    logger.error({ err }, "GET /general-products/categories failed");
    res.status(500).json({ error: "Failed to fetch general categories" });
  }
});

// ── GET /admin (auth – all statuses, paginated) ───────────────────────────────
router.get("/admin", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, offset } = paginate(req);
    const { search, categoryId, subCategory } = req.query;

    const conditions: SQL[] = [];
    if (categoryId)  conditions.push(eq(generalProductsTable.categoryId, Number(categoryId)));
    if (subCategory) conditions.push(eq(generalProductsTable.subCategory, String(subCategory)));
    if (search) {
      conditions.push(
        or(
          ilike(generalProductsTable.name,  `%${search}%`),
          ilike(generalProductsTable.brand, `%${search}%`),
        ) as SQL,
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const [rows, [totalRow]] = await Promise.all([
      db.select({
        ...getTableColumns(generalProductsTable),
        categoryName: categoriesTable.name,
      })
        .from(generalProductsTable)
        .leftJoin(categoriesTable, eq(generalProductsTable.categoryId, categoriesTable.id))
        .where(where)
        .orderBy(desc(generalProductsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(generalProductsTable).where(where ?? sql`true`),
    ]);

    res.json({ data: rows, total: totalRow?.count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "GET /general-products/admin failed");
    res.status(500).json({ error: "Failed to fetch general products" });
  }
});

// ── GET / (public – active only) ──────────────────────────────────────────────
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { page, limit, offset } = paginate(req);
    const { search, categoryId, subCategory, featured } = req.query;

    const conditions: SQL[] = [eq(generalProductsTable.status, "active")];
    if (categoryId)  conditions.push(eq(generalProductsTable.categoryId, Number(categoryId)));
    if (subCategory) conditions.push(eq(generalProductsTable.subCategory, String(subCategory)));
    if (featured === "true") conditions.push(eq(generalProductsTable.featured, true));
    if (search) {
      conditions.push(
        or(
          ilike(generalProductsTable.name,        `%${search}%`),
          ilike(generalProductsTable.brand,       `%${search}%`),
          ilike(generalProductsTable.description, `%${search}%`),
        ) as SQL,
      );
    }

    const where = and(...conditions);

    const [rows, [totalRow]] = await Promise.all([
      db.select({
        ...getTableColumns(generalProductsTable),
        categoryName: categoriesTable.name,
      })
        .from(generalProductsTable)
        .leftJoin(categoriesTable, eq(generalProductsTable.categoryId, categoriesTable.id))
        .where(where)
        .orderBy(asc(generalProductsTable.name))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(generalProductsTable).where(where),
    ]);

    res.json({ data: rows, total: totalRow?.count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "GET /general-products failed");
    res.status(500).json({ error: "Failed to fetch general products" });
  }
});

// ── GET /:id (public) ─────────────────────────────────────────────────────────
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db
      .select({ ...getTableColumns(generalProductsTable), categoryName: categoriesTable.name })
      .from(generalProductsTable)
      .leftJoin(categoriesTable, eq(generalProductsTable.categoryId, categoriesTable.id))
      .where(and(eq(generalProductsTable.id, id), eq(generalProductsTable.status, "active")));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    logger.error({ err }, "GET /general-products/:id failed");
    res.status(500).json({ error: "Failed to fetch general product" });
  }
});

// ── POST / (admin) ────────────────────────────────────────────────────────────
router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const fields = ["name", "brand", "description", "categoryId", "subCategory", "packing", "mrp", "sellingPrice", "discount", "stockStatus", "stockQty", "imageUrl", "featured", "newArrival", "status"] as const;
    const data = Object.fromEntries(Object.entries(body).filter(([key]) => (fields as readonly string[]).includes(key))) as InsertGeneralProduct;
    if (!data.name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
    if (data.status && !["active", "deleted"].includes(data.status)) { res.status(400).json({ error: "Invalid status" }); return; }
    if (data.stockStatus && !["in_stock", "out_of_stock"].includes(data.stockStatus)) { res.status(400).json({ error: "Invalid stock status" }); return; }
    const [created] = await db.insert(generalProductsTable).values(data).returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "POST /general-products failed");
    res.status(500).json({ error: "Failed to create general product" });
  }
});

// ── PUT /:id (admin) ──────────────────────────────────────────────────────────
router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = req.body as Record<string, unknown>;
    const fields = ["name", "brand", "description", "categoryId", "subCategory", "packing", "mrp", "sellingPrice", "discount", "stockStatus", "stockQty", "imageUrl", "featured", "newArrival", "status"] as const;
    const patch = Object.fromEntries(Object.entries(body).filter(([key]) => (fields as readonly string[]).includes(key))) as Partial<InsertGeneralProduct>;
    if (patch.name !== undefined && (typeof patch.name !== "string" || !patch.name.trim())) { res.status(400).json({ error: "name must be non-empty" }); return; }
    if (patch.status !== undefined && !["active", "deleted"].includes(patch.status)) { res.status(400).json({ error: "Invalid status" }); return; }
    if (patch.stockStatus !== undefined && !["in_stock", "out_of_stock"].includes(patch.stockStatus)) { res.status(400).json({ error: "Invalid stock status" }); return; }
    const [updated] = await db
      .update(generalProductsTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(generalProductsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /general-products/:id failed");
    res.status(500).json({ error: "Failed to update general product" });
  }
});

// ── DELETE /:id (admin – soft delete) ────────────────────────────────────────
router.delete("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db
      .update(generalProductsTable)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(generalProductsTable.id, id))
      .returning();
    if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /general-products/:id failed");
    res.status(500).json({ error: "Failed to delete general product" });
  }
});

export default router;
