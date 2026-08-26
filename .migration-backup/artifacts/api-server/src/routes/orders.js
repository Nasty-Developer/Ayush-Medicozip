/**
 * Orders API — Phase 2 cart-based checkout (replaces Firestore "orders").
 *
 * GET    /api/orders/next-id           → next AYM-YYYY-NNNNNN sequence
 * GET    /api/orders                   → ?customerId=<uid> (self or admin) | admin: all
 * GET    /api/orders/by-order-id/:id   → lookup by human order id
 * GET    /api/orders/:id               → lookup by numeric id
 * POST   /api/orders                   → create order + items (customer)
 * PATCH  /api/orders/:id/status        → admin: set status
 * PATCH  /api/orders/:id/payment       → admin/customer: merge payment fields
 * PATCH  /api/orders/:id/delivery      → admin: merge delivery fields
 * PATCH  /api/orders/:id/fields        → admin: generic field/dotted-path merge
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, orderItemsTable } from "@workspace/db";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, isAdminEmail } from "../middlewares/authMiddleware";
const router = Router();
const ORDER_PREFIX = "AYM";
const JSONB_COLUMNS = ["address", "pricing", "payment", "prescription", "delivery"];
async function attachItems(order) {
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
    return { ...order, items };
}
// ── GET /api/orders/next-id ───────────────────────────────────────────────────
router.get("/next-id", requireAuth, async (_req, res) => {
    try {
        const year = new Date().getFullYear();
        const [row] = await db
            .select({ orderId: ordersTable.orderId })
            .from(ordersTable)
            .where(and(gte(ordersTable.orderId, `${ORDER_PREFIX}-${year}-000000`), lte(ordersTable.orderId, `${ORDER_PREFIX}-${year}-999999`)))
            .orderBy(desc(ordersTable.orderId))
            .limit(1);
        let seq = 1;
        if (row?.orderId) {
            const match = row.orderId.match(/(\d{6})$/);
            seq = match ? parseInt(match[1], 10) + 1 : 1;
        }
        res.json({ orderId: `${ORDER_PREFIX}-${year}-${String(seq).padStart(6, "0")}` });
    }
    catch (err) {
        logger.error({ err }, "GET /orders/next-id failed");
        res.status(500).json({ error: "Failed to generate order id" });
    }
});
// ── GET /api/orders ────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req, res) => {
    try {
        const { customerId, status, limit: limitParam, offset: offsetParam } = req.query;
        const limitVal = Math.min(Number(limitParam) || 100, 500);
        const offsetVal = Number(offsetParam) || 0;
        const admin = isAdminEmail(req.firebaseUser?.email);
        if (customerId) {
            if (String(customerId) !== req.firebaseUser?.uid && !admin) {
                res.status(403).json({ error: "Forbidden" });
                return;
            }
        }
        else if (!admin) {
            res.status(403).json({ error: "Forbidden: admin access required" });
            return;
        }
        const conds = [];
        if (customerId)
            conds.push(eq(ordersTable.customerId, String(customerId)));
        if (status)
            conds.push(eq(ordersTable.status, String(status)));
        const where = conds.length ? and(...conds) : undefined;
        const orders = await db
            .select()
            .from(ordersTable)
            .where(where)
            .orderBy(desc(ordersTable.createdAt))
            .limit(limitVal)
            .offset(offsetVal);
        res.json(orders);
    }
    catch (err) {
        logger.error({ err }, "GET /orders failed");
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
// Named route must come before /:id to avoid being shadowed
router.get("/by-order-id/:orderId", requireAuth, async (req, res) => {
    try {
        const [order] = await db
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.orderId, String(req.params["orderId"] ?? "").toUpperCase()));
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const admin = isAdminEmail(req.firebaseUser?.email);
        if (order.customerId !== req.firebaseUser?.uid && !admin) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        res.json(await attachItems(order));
    }
    catch (err) {
        logger.error({ err }, "Failed to fetch order");
        res.status(500).json({ error: "Failed to fetch order" });
    }
});
router.get("/:id", requireAuth, async (req, res) => {
    try {
        const id = Number(req.params["id"]);
        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid id" });
            return;
        }
        const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
        if (!order) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const admin = isAdminEmail(req.firebaseUser?.email);
        if (order.customerId !== req.firebaseUser?.uid && !admin) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        res.json(await attachItems(order));
    }
    catch (err) {
        logger.error({ err }, "Failed to fetch order");
        res.status(500).json({ error: "Failed to fetch order" });
    }
});
// ── POST /api/orders ──────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req, res) => {
    try {
        const { items, ...orderData } = req.body;
        const data = orderData;
        if (!data.orderId || !data.customerName || !data.customerPhone) {
            res.status(400).json({ error: "orderId, customerName, and customerPhone are required" });
            return;
        }
        // Force customerId to the authenticated caller — never trust the client.
        data.customerId = req.firebaseUser.uid;
        const result = await db.transaction(async (tx) => {
            const [created] = await tx.insert(ordersTable).values(data).returning();
            if (Array.isArray(items) && items.length > 0) {
                await tx.insert(orderItemsTable).values(items.map((i) => ({ ...i, orderId: created.id })));
            }
            return created;
        });
        res.status(201).json(await attachItems(result));
    }
    catch (err) {
        if (err.code === "23505") {
            res.status(409).json({ error: "Order ID already exists" });
            return;
        }
        logger.error({ err }, "Failed to create order");
        res.status(500).json({ error: "Failed to create order" });
    }
});
// ── PATCH /api/orders/:id/status ──────────────────────────────────────────────
router.patch("/:id/status", requireAuth, async (req, res) => {
    try {
        const id = Number(req.params["id"]);
        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid id" });
            return;
        }
        const { status } = req.body;
        if (!status) {
            res.status(400).json({ error: "status is required" });
            return;
        }
        const admin = isAdminEmail(req.firebaseUser?.email);
        const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
        if (!existing) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        // Customers may only cancel their own pending/payment-pending order.
        if (!admin) {
            const isOwner = existing.customerId === req.firebaseUser?.uid;
            const canCancel = status === "cancelled" && ["pending", "payment-pending"].includes(existing.status);
            if (!isOwner || !canCancel) {
                res.status(403).json({ error: "Forbidden" });
                return;
            }
        }
        const [updated] = await db
            .update(ordersTable)
            .set({ status, updatedAt: new Date() })
            .where(eq(ordersTable.id, id))
            .returning();
        res.json(updated);
    }
    catch (err) {
        logger.error({ err }, "Failed to update order status");
        res.status(500).json({ error: "Failed to update order status" });
    }
});
// ── Generic JSONB-column merge helper ────────────────────────────────────────
async function mergeJsonbColumn(req, res, column) {
    const id = Number(req.params["id"]);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid id" });
        return;
    }
    const patch = req.body;
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) {
        res.status(404).json({ error: "Order not found" });
        return;
    }
    const admin = isAdminEmail(req.firebaseUser?.email);
    if (!admin && existing.customerId !== req.firebaseUser?.uid) {
        res.status(403).json({ error: "Forbidden" });
        return;
    }
    const merged = { ...existing[column], ...patch };
    const [updated] = await db
        .update(ordersTable)
        .set({ [column]: merged, updatedAt: new Date() })
        .where(eq(ordersTable.id, id))
        .returning();
    res.json(updated);
}
router.patch("/:id/payment", requireAuth, async (req, res) => {
    try {
        await mergeJsonbColumn(req, res, "payment");
    }
    catch (err) {
        logger.error({ err }, "Failed to update order payment");
        res.status(500).json({ error: "Failed to update order payment" });
    }
});
router.patch("/:id/delivery", requireAuth, async (req, res) => {
    try {
        await mergeJsonbColumn(req, res, "delivery");
    }
    catch (err) {
        logger.error({ err }, "Failed to update order delivery");
        res.status(500).json({ error: "Failed to update order delivery" });
    }
});
router.patch("/:id/prescription", requireAuth, async (req, res) => {
    try {
        await mergeJsonbColumn(req, res, "prescription");
    }
    catch (err) {
        logger.error({ err }, "Failed to update order prescription");
        res.status(500).json({ error: "Failed to update order prescription" });
    }
});
// ── PATCH /api/orders/:id/fields ──────────────────────────────────────────────
// Generic patch supporting dotted paths (e.g. "prescription.rejectionReason")
// against the JSONB sub-objects, plus plain top-level columns (notes/status).
// Mirrors the old Firestore updateOrderFields() call sites exactly.
router.patch("/:id/fields", requireAuth, async (req, res) => {
    try {
        const id = Number(req.params["id"]);
        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid id" });
            return;
        }
        const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
        if (!existing) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const admin = isAdminEmail(req.firebaseUser?.email);
        if (!admin && existing.customerId !== req.firebaseUser?.uid) {
            res.status(403).json({ error: "Forbidden" });
            return;
        }
        const fields = req.body;
        const jsonbPatches = {};
        const topLevel = {};
        for (const [key, value] of Object.entries(fields)) {
            const dotIdx = key.indexOf(".");
            if (dotIdx > 0) {
                const prefix = key.slice(0, dotIdx);
                const rest = key.slice(dotIdx + 1);
                if (JSONB_COLUMNS.includes(prefix)) {
                    jsonbPatches[prefix] = { ...(jsonbPatches[prefix] ?? {}), [rest]: value };
                    continue;
                }
            }
            if (key === "notes" || key === "status") {
                topLevel[key] = value;
            }
        }
        const updates = { ...topLevel, updatedAt: new Date() };
        for (const col of JSONB_COLUMNS) {
            if (jsonbPatches[col]) {
                updates[col] = { ...existing[col], ...jsonbPatches[col] };
            }
        }
        const [updated] = await db
            .update(ordersTable)
            .set(updates)
            .where(eq(ordersTable.id, id))
            .returning();
        res.json(updated);
    }
    catch (err) {
        logger.error({ err }, "Failed to update order fields");
        res.status(500).json({ error: "Failed to update order fields" });
    }
});
export default router;
