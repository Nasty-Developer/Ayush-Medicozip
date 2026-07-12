/**
 * Admin API routes — dashboard stats + CRUD for companies, drug groups, medicines.
 *
 * All data is read from / written to PostgreSQL.
 * Write endpoints require Firebase Auth (requireAuth + requireAdminEmail).
 *
 * Endpoints:
 *   GET  /api/admin/stats               → {medicines, categories, companies, drugGroups}
 *   GET  /api/admin/companies           → paginated company list
 *   POST /api/admin/companies           → create company
 *   PUT  /api/admin/companies/:id       → rename company
 *   DELETE /api/admin/companies/:id     → delete company
 *   GET  /api/admin/drug-groups         → paginated drug-group list
 *   GET  /api/admin/medicines           → paginated admin medicine list (with joins)
 *   POST /api/admin/medicines           → create medicine
 *   PUT  /api/admin/medicines/:id       → update medicine
 *   DELETE /api/admin/medicines/:id     → soft-delete medicine (status → deleted)
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  medicinesTable, categoriesTable, companiesTable, drugGroupsTable,
  type InsertMedicine, type InsertCompany,
} from "@workspace/db";
import { eq, sql, count, ilike, or, and, asc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

// ── GET /api/admin/stats ──────────────────────────────────────────────────────

router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [[medRow], [catRow], [coRow], [dgRow]] = await Promise.all([
      db.select({ count: count() }).from(medicinesTable).where(eq(medicinesTable.status, "active")),
      db.select({ count: count() }).from(categoriesTable),
      db.select({ count: count() }).from(companiesTable),
      db.select({ count: count() }).from(drugGroupsTable),
    ]);
    res.json({
      medicines:  medRow?.count  ?? 0,
      categories: catRow?.count  ?? 0,
      companies:  coRow?.count   ?? 0,
      drugGroups: dgRow?.count   ?? 0,
    });
  } catch (err) {
    logger.error({ err }, "GET /admin/stats failed");
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ── Companies ─────────────────────────────────────────────────────────────────

router.get("/companies", async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query["search"] ? String(req.query["search"]) : undefined;
    const page   = Math.max(1, parseInt(String(req.query["page"]  ?? "1"),   10));
    const limit  = Math.min(200, parseInt(String(req.query["limit"] ?? "50"), 10));
    const offset = (page - 1) * limit;

    const cond = search ? ilike(companiesTable.name, `%${search}%`) : undefined;

    const [rows, [total]] = await Promise.all([
      db.select().from(companiesTable)
        .where(cond)
        .orderBy(asc(companiesTable.name))
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(companiesTable).where(cond ?? sql`true`),
    ]);

    res.json({ data: rows, total: total?.count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "GET /admin/companies failed");
    res.status(500).json({ error: "Failed to fetch companies" });
  }
});

router.post("/companies", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.body as InsertCompany;
    if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
    const [created] = await db.insert(companiesTable).values({ name: name.trim() }).returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err.code === "23505") { res.status(409).json({ error: "Company already exists" }); return; }
    logger.error({ err }, "POST /admin/companies failed");
    res.status(500).json({ error: "Failed to create company" });
  }
});

router.put("/companies/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { name } = req.body as { name: string };
    if (!name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
    const [updated] = await db.update(companiesTable).set({ name: name.trim() }).where(eq(companiesTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Company not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /admin/companies/:id failed");
    res.status(500).json({ error: "Failed to update company" });
  }
});

router.delete("/companies/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(companiesTable).where(eq(companiesTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Company not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /admin/companies/:id failed");
    res.status(500).json({ error: "Failed to delete company" });
  }
});

// ── Drug Groups ───────────────────────────────────────────────────────────────

router.get("/drug-groups", async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query["search"] ? String(req.query["search"]) : undefined;
    const page   = Math.max(1, parseInt(String(req.query["page"]  ?? "1"),   10));
    const limit  = Math.min(200, parseInt(String(req.query["limit"] ?? "50"), 10));
    const offset = (page - 1) * limit;

    const cond = search ? ilike(drugGroupsTable.name, `%${search}%`) : undefined;

    const [rows, [total]] = await Promise.all([
      db.select().from(drugGroupsTable)
        .where(cond)
        .orderBy(asc(drugGroupsTable.name))
        .limit(limit).offset(offset),
      db.select({ count: count() }).from(drugGroupsTable).where(cond ?? sql`true`),
    ]);

    res.json({ data: rows, total: total?.count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "GET /admin/drug-groups failed");
    res.status(500).json({ error: "Failed to fetch drug groups" });
  }
});

// ── Medicines (admin) ─────────────────────────────────────────────────────────

router.get("/medicines", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const search = req.query["search"] ? String(req.query["search"]) : undefined;
    const page   = Math.max(1, parseInt(String(req.query["page"]  ?? "1"),   10));
    const limit  = Math.min(100, parseInt(String(req.query["limit"] ?? "50"), 10));
    const offset = (page - 1) * limit;

    const statusFilter = (req.query["status"] as string) ?? "active";
    const statusCond = statusFilter === "all"
      ? undefined
      : eq(medicinesTable.status, statusFilter as "active" | "deleted");

    const searchCond = search ? or(
      ilike(medicinesTable.name, `%${search}%`),
      ilike(medicinesTable.genericName, `%${search}%`),
    ) : undefined;

    // Optional boolean flag filters
    const flagConds: ReturnType<typeof eq>[] = [];
    if (req.query["featured"]   === "true") flagConds.push(eq(medicinesTable.featured,   true));
    if (req.query["newArrival"] === "true") flagConds.push(eq(medicinesTable.newArrival, true));
    if (req.query["special"]    === "true") flagConds.push(eq(medicinesTable.special,    true));

    const allConds = [statusCond, searchCond, ...flagConds].filter(Boolean) as Parameters<typeof and>;
    const where = allConds.length > 0 ? and(...allConds) : undefined;

    const [rows, [totalRow]] = await Promise.all([
      db
        .select({
          id:                  medicinesTable.id,
          productCode:         medicinesTable.productCode,
          name:                medicinesTable.name,
          genericName:         medicinesTable.genericName,
          packing:             medicinesTable.packing,
          mrp:                 medicinesTable.mrp,
          sellingPrice:        medicinesTable.sellingPrice,
          discount:            medicinesTable.discount,
          prescriptionRequired: medicinesTable.prescriptionRequired,
          stockStatus:         medicinesTable.stockStatus,
          stockQty:            medicinesTable.stockQty,
          imageUrl:            medicinesTable.imageUrl,
          featured:            medicinesTable.featured,
          newArrival:          medicinesTable.newArrival,
          special:             medicinesTable.special,
          status:              medicinesTable.status,
          companyId:           medicinesTable.companyId,
          categoryId:          medicinesTable.categoryId,
          companyName:         companiesTable.name,
          categoryName:        categoriesTable.name,
        })
        .from(medicinesTable)
        .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
        .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
        .where(where)
        .orderBy(asc(medicinesTable.name))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() }).from(medicinesTable).where(where),
    ]);

    res.json({ data: rows, total: totalRow?.count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "GET /admin/medicines failed");
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

router.post("/medicines", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<InsertMedicine>;
    if (!body.name?.trim()) { res.status(400).json({ error: "name is required" }); return; }
    // Auto-generate productCode for manually-created medicines (avoid SDF range)
    if (body.productCode == null) {
      body.productCode = Math.floor(Date.now() / 100) % 2_000_000_000;
    }
    const [created] = await db.insert(medicinesTable).values(body as InsertMedicine).returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err.code === "23505") { res.status(409).json({ error: "Medicine with this product code already exists" }); return; }
    logger.error({ err }, "POST /admin/medicines failed");
    res.status(500).json({ error: "Failed to create medicine" });
  }
});

router.put("/medicines/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const body = { ...(req.body as Partial<InsertMedicine>) };
    delete body.productCode; // never overwrite the SDF key
    delete body.id;
    const [updated] = await db
      .update(medicinesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(medicinesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Medicine not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /admin/medicines/:id failed");
    res.status(500).json({ error: "Failed to update medicine" });
  }
});

router.delete("/medicines/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(medicinesTable)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(medicinesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Medicine not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /admin/medicines/:id failed");
    res.status(500).json({ error: "Failed to delete medicine" });
  }
});

export default router;
