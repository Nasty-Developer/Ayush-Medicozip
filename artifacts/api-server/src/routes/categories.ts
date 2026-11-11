import { Router, type Request, type Response } from "express";
import { sql, eq, and, getTableColumns } from "drizzle-orm";
import { db } from "@workspace/db";
import { categoriesTable, medicinesTable, type InsertCategory } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware.js";

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

/**
 * The admin form posts display fields (`order`, and sometimes `slug`) straight
 * from the browser. `order` is not a column — the category table stores
 * display_order — so inserting the body verbatim failed with a 500 and the
 * dialog only ever said "Failed to save category". Only known columns are
 * forwarded, and a slug is derived from the name when the client omits it.
 */
function slugifyCategoryName(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "category";
}

function categoryPayload(body: Record<string, unknown>, requireSlug: boolean): Partial<InsertCategory> {
  const payload: Partial<InsertCategory> = {};
  const name = typeof body["name"] === "string" ? body["name"].trim() : "";
  if (name) payload.name = name;

  const rawSlug = typeof body["slug"] === "string" ? body["slug"].trim() : "";
  if (rawSlug) payload.slug = slugifyCategoryName(rawSlug);
  else if (requireSlug && name) payload.slug = slugifyCategoryName(name);

  if (typeof body["description"] === "string") payload.description = body["description"].trim();
  if (typeof body["imageUrl"] === "string" || body["imageUrl"] === null) {
    payload.imageUrl = (body["imageUrl"] as string | null) ?? null;
  }
  if (typeof body["icon"] === "string" && body["icon"].trim()) payload.icon = body["icon"].trim();
  if (typeof body["color"] === "string" && body["color"].trim()) payload.color = body["color"].trim();
  if (typeof body["enabled"] === "boolean") payload.enabled = body["enabled"];

  // display_order is a 32-bit integer and the dialog sends Date.now() as the
  // order for a new category, which overflows the column and fails the insert.
  // Anything out of range is dropped here so the handler can pick a safe value.
  const order = body["displayOrder"] ?? body["order"];
  if (typeof order === "number" && Number.isFinite(order)) {
    const truncated = Math.trunc(order);
    if (truncated >= 0 && truncated <= 2_147_483_647) payload.displayOrder = truncated;
  }

  const collection = body["collectionType"];
  if (collection === "medicine" || collection === "veterinary" || collection === "general") {
    payload.collectionType = collection;
  }
  return payload;
}

// Admin-only writes
router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = categoryPayload(req.body as Record<string, unknown>, true);
    if (!data.name) { res.status(400).json({ error: "name is required" }); return; }
    if (!data.slug) data.slug = slugifyCategoryName(data.name);
    if (data.displayOrder === undefined) {
      const [{ nextOrder }] = await db
        .select({ nextOrder: sql<number>`coalesce(max(${categoriesTable.displayOrder}), 0) + 1` })
        .from(categoriesTable);
      data.displayOrder = Number(nextOrder) || 1;
    }
    const [created] = await db.insert(categoriesTable).values(data as InsertCategory).returning();
    res.status(201).json(created);
  } catch (err: any) {
    if (err?.code === "23505" || err?.cause?.code === "23505") {
      res.status(409).json({ error: "A category with this name already exists" });
      return;
    }
    logger.error({ err }, "Failed to create category");
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const patch = categoryPayload(req.body as Record<string, unknown>, false);
    const [updated] = await db
      .update(categoriesTable)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Category not found" }); return; }
    res.json(updated);
  } catch (err: any) {
    if (err?.code === "23505" || err?.cause?.code === "23505") {
      res.status(409).json({ error: "Another category already uses this name" });
      return;
    }
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
