import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { productsTable, inventoryTable, type InsertProduct, type InsertInventory } from "@workspace/db";
import { eq, ilike, or, and, type SQL } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

// Public: browse products
router.get("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, category, stockStatus, showInNewArrivals, showInSpecialMedicines } = req.query;
    const conditions: SQL[] = [];

    if (category) conditions.push(eq(productsTable.categoryId, Number(category)));
    if (stockStatus) conditions.push(eq(productsTable.stockStatus, String(stockStatus) as "in_stock" | "out_of_stock" | "coming_soon"));
    if (showInNewArrivals === "true") conditions.push(eq(productsTable.showInNewArrivals, true));
    if (showInSpecialMedicines === "true") conditions.push(eq(productsTable.showInSpecialMedicines, true));
    if (search) {
      conditions.push(
        or(ilike(productsTable.name, `%${search}%`), ilike(productsTable.brand, `%${search}%`)) as SQL
      );
    }

    const products = await db
      .select()
      .from(productsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(productsTable.displayOrder, productsTable.name);

    res.json(products);
  } catch (err) {
    logger.error({ err }, "Failed to fetch products");
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!product) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(product);
  } catch (err) {
    logger.error({ err }, "Failed to fetch product");
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

// Admin-only writes
router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as InsertProduct;
    if (!data.name) { res.status(400).json({ error: "name is required" }); return; }
    if (!data.slug) data.slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [created] = await db.insert(productsTable).values(data).returning();
    await db.insert(inventoryTable).values({ productId: created.id, quantity: 0 }).onConflictDoNothing();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(productsTable)
      .set({ ...(req.body as Partial<InsertProduct>), updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Product not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

router.get("/:id/inventory", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params["id"]);
    if (isNaN(productId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [inv] = await db.select().from(inventoryTable).where(eq(inventoryTable.productId, productId));
    if (!inv) { res.status(404).json({ error: "Inventory not found" }); return; }
    res.json(inv);
  } catch (err) {
    logger.error({ err }, "Failed to fetch inventory");
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

router.put("/:id/inventory", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const productId = Number(req.params["id"]);
    if (isNaN(productId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const data = req.body as Partial<InsertInventory>;
    const [updated] = await db
      .update(inventoryTable)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(inventoryTable.productId, productId))
      .returning();
    if (!updated) { res.status(404).json({ error: "Inventory not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update inventory");
    res.status(500).json({ error: "Failed to update inventory" });
  }
});

export default router;
