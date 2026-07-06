import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable, type InsertOrder, type InsertOrderItem } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

// Admin: list orders
router.get("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, limit: limitParam, offset: offsetParam } = req.query;
    const limitVal = Math.min(Number(limitParam) || 50, 200);
    const offsetVal = Number(offsetParam) || 0;

    const orders = status
      ? await db.select().from(ordersTable).where(eq(ordersTable.status, String(status))).orderBy(desc(ordersTable.createdAt)).limit(limitVal).offset(offsetVal)
      : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(limitVal).offset(offsetVal);

    res.json(orders);
  } catch (err) {
    logger.error({ err }, "Failed to fetch orders");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Named route must come before /:id to avoid being shadowed
router.get("/by-order-id/:orderId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderId, String(req.params["orderId"] ?? "").toUpperCase()));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    res.json({ ...order, items });
  } catch (err) {
    logger.error({ err }, "Failed to fetch order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, id));
    res.json({ ...order, items });
  } catch (err) {
    logger.error({ err }, "Failed to fetch order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// Customer or webhook creates an order — authenticated, not admin-restricted
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { items, ...orderData } = req.body as { items?: InsertOrderItem[]; [key: string]: unknown };
    const data = orderData as InsertOrder;
    if (!data.orderId || !data.customerName || !data.mobileNumber) {
      res.status(400).json({ error: "orderId, customerName, and mobileNumber are required" });
      return;
    }

    // Atomic: create order + items in a single transaction
    const result = await db.transaction(async (tx) => {
      const [created] = await tx.insert(ordersTable).values(data).returning();
      if (Array.isArray(items) && items.length > 0) {
        await tx.insert(orderItemsTable).values(items.map((i) => ({ ...i, orderId: created.id })));
      }
      return created;
    });

    const orderItems = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, result.id));
    res.status(201).json({ ...result, items: orderItems });
  } catch (err) {
    logger.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(ordersTable)
      .set({ ...(req.body as Partial<InsertOrder>), updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update order");
    res.status(500).json({ error: "Failed to update order" });
  }
});

router.patch("/:id/status", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { status } = req.body as { status?: string };
    if (!status) { res.status(400).json({ error: "status is required" }); return; }
    const [updated] = await db
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
