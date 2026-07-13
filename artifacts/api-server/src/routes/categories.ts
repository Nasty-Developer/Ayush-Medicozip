import { Router, type Request, type Response } from "express";
import { sql, eq, and, getTableColumns } from "drizzle-orm";
import { db } from "@workspace/db";
import { categoriesTable, medicinesTable, type InsertCategory } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

// Public: browse categories (with per-category medicine count)
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        ...getTableColumns(categoriesTable),
        count: sql<number>`cast(count(${medicinesTable.id}) as int)`,
      })
      .from(categoriesTable)
      .leftJoin(
        medicinesTable,
        and(
          eq(medicinesTable.categoryId, categoriesTable.id),
          eq(medicinesTable.status, "active"),
        ),
      )
      .where(eq(categoriesTable.enabled, true))
      .groupBy(categoriesTable.id)
      .orderBy(categoriesTable.displayOrder, categoriesTable.name);

    res.json({ data: rows });
  } catch (err) {
    logger.error({ err }, "Failed to fetch categories");
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!category) { res.status(404).json({ error: "Category not found" }); return; }
    res.json(category);
  } catch (err) {
    logger.error({ err }, "Failed to fetch category");
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

// Admin-only writes
router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as InsertCategory;
    if (!data.name || !data.slug) { res.status(400).json({ error: "name and slug are required" }); return; }
    const [created] = await db.insert(categoriesTable).values(data).returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "Failed to create category");
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(categoriesTable)
      .set({ ...(req.body as Partial<InsertCategory>), updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Category not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update category");
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Category not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "Failed to delete category" });
  }
});

export default router;
