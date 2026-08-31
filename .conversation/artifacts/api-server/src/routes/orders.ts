/**
 * Orders API — Phase 2 cart-based checkout (replaces Firestore "orders").
 *
 * GET    /api/orders/next-id           → next AYM-YYYY-NNNNNN sequence
 * GET    /api/orders                   → ?customerId=<uid> (self or admin) | admin: all
 * GET    /api/orders/by-order-id/:id   → lookup by human order id
 * GET    /api/orders/:id               → lookup by numeric id
 * POST   /api/orders                   → create order + items (customer)
 * PATCH  /api/orders/:id/status        → admin: set status
 * PATCH  /api/orders/:id/payment       → admin: merge payment fields
 * PATCH  /api/orders/:id/delivery      → admin: merge delivery fields
 * PATCH  /api/orders/:id/fields        → admin: generic field/dotted-path merge
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  ordersTable, orderItemsTable, medicinesTable, generalProductsTable, vetMedicinesTable,
  couponsTable, type InsertOrder, type InsertOrderItem,
} from "@workspace/db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { requireAuth, isAdminEmail, type AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const router = Router();

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ORDER_PREFIX = "AYM";
const JSONB_COLUMNS = ["address", "pricing", "payment", "prescription", "delivery"] as const;
type JsonbColumn = (typeof JSONB_COLUMNS)[number];
const ORDER_STATUSES = [
  "pending",
  "payment-pending",
  "payment-verification-pending",
  "payment-verified",
  "confirmed",
  "preparing",
  "packed",
  "ready-for-pickup",
  "delivery-assigned",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "returned",
  "refunded",
] as const;

const ALLOWED_STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ["payment-pending", "confirmed", "cancelled"],
  "payment-pending": ["payment-verification-pending", "cancelled"],
  "payment-verification-pending": ["payment-verified", "cancelled"],
  "payment-verified": ["confirmed", "preparing", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["packed", "cancelled"],
  packed: ["ready-for-pickup", "cancelled"],
  "ready-for-pickup": ["delivery-assigned", "cancelled"],
  "delivery-assigned": ["out-for-delivery", "cancelled"],
  "out-for-delivery": ["delivered", "returned"],
  delivered: ["returned", "refunded"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
};

async function attachItems(order: typeof ordersTable.$inferSelect) {
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
  return { ...order, items };
}

// ── GET /api/orders/next-id ───────────────────────────────────────────────────
router.get("/next-id", requireAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    const year = new Date().getFullYear();
    const [row] = await db
      .select({ orderId: ordersTable.orderId })
      .from(ordersTable)
      .where(and(
        gte(ordersTable.orderId, `${ORDER_PREFIX}-${year}-000000`),
        lte(ordersTable.orderId, `${ORDER_PREFIX}-${year}-999999`),
      ))
      .orderBy(desc(ordersTable.orderId))
      .limit(1);

    let seq = 1;
    if (row?.orderId) {
      const match = row.orderId.match(/(\d{6})$/);
      seq = match ? parseInt(match[1], 10) + 1 : 1;
    }
    res.json({ orderId: `${ORDER_PREFIX}-${year}-${String(seq).padStart(6, "0")}` });
  } catch (err) {
    logger.error({ err }, "GET /orders/next-id failed");
    res.status(500).json({ error: "Failed to generate order id" });
  }
});

// ── GET /api/orders/lookup ─────────────────────────────────────────────────────
// Public tracking lookup for cart orders. The order ID and mobile number must
// match the same record; return only the fields needed by the tracking screen.
router.get("/lookup", async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = String(req.query.orderId ?? "").trim().toUpperCase();
    const mobile = String(req.query.mobile ?? "").replace(/\D/g, "").replace(/^91/, "");
    if (!orderId || mobile.length < 10) {
      res.status(400).json({ error: "Order ID and mobile number are required" });
      return;
    }

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderId, orderId));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const storedMobile = String(order.customerPhone ?? "").replace(/\D/g, "").replace(/^91/, "");
    if (storedMobile !== mobile) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const items = await db
      .select()
      .from(orderItemsTable)
      .where(eq(orderItemsTable.orderId, order.id));
    const address = (order.address as Record<string, unknown>) ?? {};
    const fullAddress = [
      address.houseNumber,
      address.buildingName,
      address.street,
      address.area,
      address.landmark,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean).join(", ");

    res.json({
      id: String(order.id),
      inquiryId: order.orderId,
      customerName: order.customerName,
      mobileNumber: order.customerPhone,
      medicineName: items.map((item) => item.medicineName).join(", "),
      quantity: items.map((item) => `${item.medicineName} × ${item.quantity}`).join(", "),
      fullAddress,
      status: order.status,
      grandTotal: Number((order.pricing as Record<string, unknown>)?.grandTotal ?? 0),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      flow: "order",
    });
  } catch (err) {
    logger.error({ err }, "GET /orders/lookup failed");
    res.status(500).json({ error: "Failed to look up order" });
  }
});

// ── GET /api/orders ────────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    } else if (!admin) {
      res.status(403).json({ error: "Forbidden: admin access required" });
      return;
    }

    const conds = [];
    if (customerId) conds.push(eq(ordersTable.customerId, String(customerId)));
    if (status) conds.push(eq(ordersTable.status, String(status)));
    const where = conds.length ? and(...conds) : undefined;

    const orders = await db
      .select()
      .from(ordersTable)
      .where(where)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limitVal)
      .offset(offsetVal);

    res.json(orders);
  } catch (err) {
    logger.error({ err }, "GET /orders failed");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Named route must come before /:id to avoid being shadowed
router.get("/by-order-id/:orderId", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.orderId, String(req.params["orderId"] ?? "").toUpperCase()));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const admin = isAdminEmail(req.firebaseUser?.email);
    if (order.customerId !== req.firebaseUser?.uid && !admin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await attachItems(order));
  } catch (err) {
    logger.error({ err }, "Failed to fetch order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

router.get("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    const admin = isAdminEmail(req.firebaseUser?.email);
    if (order.customerId !== req.firebaseUser?.uid && !admin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    res.json(await attachItems(order));
  } catch (err) {
    logger.error({ err }, "Failed to fetch order");
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// ── POST /api/orders ──────────────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;
    const items = body.items;
    const orderId = typeof body.orderId === "string" ? body.orderId.trim().toUpperCase() : "";
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const customerPhone = typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
    const address = body.address;
    if (!/^AYM-\d{4}-\d{6}$/.test(orderId) || !customerName || !/^[0-9+\-()\s]{7,20}$/.test(customerPhone)) {
      res.status(400).json({ error: "Valid orderId, customerName, and customerPhone are required" });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "A non-empty items array is required" });
      return;
    }
    if (!address || typeof address !== "object" ||
      !["fullName", "mobileNumber", "houseNumber", "street", "pincode"].every((k) =>
        typeof (address as Record<string, unknown>)[k] === "string" &&
        String((address as Record<string, unknown>)[k]).trim().length > 0)) {
      res.status(400).json({ error: "A complete delivery address is required" });
      return;
    }
    const rawPricing = body.pricing && typeof body.pricing === "object"
      ? body.pricing as Record<string, unknown> : {};
    const couponCode = typeof rawPricing.couponCode === "string" ? rawPricing.couponCode.trim().toUpperCase() : "";

    const result = await db.transaction(async (tx: Tx) => {
      const checkedItems: InsertOrderItem[] = [];
      let subtotal = 0;
      let requiresPrescription = false;

      for (const raw of items) {
        if (!raw || typeof raw !== "object") throw new Error("INVALID_ITEM");
        const item = raw as Record<string, unknown>;
        const itemId = typeof item.medicineId === "string" ? item.medicineId.trim() : "";
        const quantity = item.quantity;
        if (!itemId || !Number.isInteger(quantity) || (quantity as number) <= 0) throw new Error("INVALID_ITEM");

        let product: { id: number; name: string; status: string; sellingPrice: string | null; stockStatus: string; stockQty: number; prescriptionRequired?: boolean; categoryId?: number | null } | undefined;
        let kind: "medicine" | "general" | "vet" = "medicine";
        if (/^\d+$/.test(itemId)) {
          const [row] = await tx.select().from(medicinesTable).where(eq(medicinesTable.id, Number(itemId)));
          product = row;
        } else {
          const match = itemId.match(/^(?:general|product)[-_:]?(\d+)$/i) ?? itemId.match(/^vet(?:erinary)?[-_:](\d+)$/i);
          if (!match) throw new Error("INVALID_ITEM");
          kind = /^vet/i.test(itemId) ? "vet" : "general";
          if (kind === "general") {
            const [row] = await tx.select().from(generalProductsTable).where(eq(generalProductsTable.id, Number(match[1])));
            product = row;
          } else {
            const [row] = await tx.select().from(vetMedicinesTable).where(eq(vetMedicinesTable.id, Number(match[1])));
            product = row;
          }
        }
        if (!product || product.status !== "active" || product.stockStatus === "out_of_stock") throw new Error("ITEM_UNAVAILABLE");
        if (product.stockQty < (quantity as number)) throw new Error("INSUFFICIENT_STOCK");
        if (product.sellingPrice == null || String(product.sellingPrice).trim() === "") {
          throw new Error("ITEM_UNAVAILABLE");
        }
        const unitPrice = Number(product.sellingPrice);
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) throw new Error("ITEM_UNAVAILABLE");
        const totalPrice = Math.round(unitPrice * (quantity as number) * 100) / 100;
        subtotal += totalPrice;
        requiresPrescription ||= product.prescriptionRequired === true;
        checkedItems.push({
          orderId: 0, medicineId: itemId, medicineName: product.name,
          categoryName: null, brandName: null, quantity: quantity as number,
          unitPrice: unitPrice.toFixed(2), totalPrice: totalPrice.toFixed(2),
          prescriptionRequired: product.prescriptionRequired === true,
        });
        const table = kind === "medicine" ? medicinesTable : kind === "general" ? generalProductsTable : vetMedicinesTable;
        await tx.update(table).set({ stockQty: sql`${table.stockQty} - ${quantity}` }).where(eq(table.id, product.id));
      }
      subtotal = Math.round(subtotal * 100) / 100;
      const deliveryCharge = subtotal > 0 && subtotal < 500 ? 40 : 0;
      const gst = Math.round(subtotal * 0.05 * 100) / 100;
      let discount = 0;
      if (couponCode) {
        const [coupon] = await tx.select().from(couponsTable).where(eq(couponsTable.code, couponCode));
        const now = new Date();
        if (coupon && coupon.isActive && (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) &&
          (!coupon.validFrom || coupon.validFrom <= now) && (!coupon.validUntil || coupon.validUntil >= now) &&
          subtotal >= Number(coupon.minimumOrderAmount)) {
          discount = coupon.discountType === "percent"
            ? subtotal * Number(coupon.discountValue) / 100 : Number(coupon.discountValue);
          if (coupon.maximumDiscount != null) discount = Math.min(discount, Number(coupon.maximumDiscount));
          discount = Math.max(0, Math.min(subtotal, Math.round(discount * 100) / 100));
        }
      }
      const grandTotal = Math.max(0, Math.round((subtotal + deliveryCharge + gst - discount) * 100) / 100);
      const data: InsertOrder = {
        orderId, customerId: req.firebaseUser!.uid, customerName,
        customerEmail: req.firebaseUser!.email ?? null, customerPhone,
        address, pricing: { subtotal, deliveryCharge, gst, discount, grandTotal, couponCode: couponCode || null },
        payment: { method: "upi", status: "pending", upiTransactionId: null },
        prescription: { required: requiresPrescription, verified: false, status: requiresPrescription ? "pending" : "not-required", url: null },
        delivery: { status: "not-assigned", partnerId: null, trackingId: null },
        status: "payment-pending", notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 2000) : null,
        source: body.source === "app" ? "app" : "website",
      };
      const [created] = await tx.insert(ordersTable).values(data).returning();
      await tx.insert(orderItemsTable).values(checkedItems.map((i) => ({ ...i, orderId: created!.id })));
      return created!;
    });

    res.status(201).json(await attachItems(result));
  } catch (err: any) {
    if (err.code === "23505") { res.status(409).json({ error: "Order ID already exists" }); return; }
    if (err.message === "INVALID_ITEM") { res.status(400).json({ error: "Invalid order item" }); return; }
    if (err.message === "ITEM_UNAVAILABLE") { res.status(409).json({ error: "One or more items are unavailable" }); return; }
    if (err.message === "INSUFFICIENT_STOCK") { res.status(409).json({ error: "Insufficient stock" }); return; }
    logger.error({ err }, "Failed to create order");
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ── PATCH /api/orders/:id/status ──────────────────────────────────────────────
router.patch("/:id/status", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { status } = req.body as { status?: string };
    if (!status) { res.status(400).json({ error: "status is required" }); return; }
    if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: "Invalid order status" });
      return;
    }

    const admin = isAdminEmail(req.firebaseUser?.email);
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    // Customers may only cancel their own pending/payment-pending order.
    if (!admin) {
      const isOwner = existing.customerId === req.firebaseUser?.uid;
      const canCancel = status === "cancelled" && ["pending", "payment-pending", "payment-verification-pending"].includes(existing.status);
      if (!isOwner || !canCancel) { res.status(403).json({ error: "Forbidden" }); return; }
    }

    if (admin) {
      const payment = (existing.payment as Record<string, unknown>) ?? {};
      const paymentIsVerified = ["paid", "verified", "completed"].includes(String(payment.status));
      const isCod = payment.method === "cod";
      const prescription = (existing.prescription as Record<string, unknown>) ?? {};
      const prescriptionIsApproved = prescription.required !== true || prescription.verified === true || prescription.status === "approved";

      if (status !== existing.status && !(ALLOWED_STATUS_TRANSITIONS[existing.status] ?? []).includes(status)) {
        res.status(409).json({ error: `Invalid status transition from ${existing.status} to ${status}` });
        return;
      }
      if (status === "payment-verified" && !paymentIsVerified) {
        res.status(409).json({ error: "Payment must be verified before this order can move forward" });
        return;
      }
      if (["confirmed", "preparing"].includes(status) && !isCod && !paymentIsVerified) {
        res.status(409).json({ error: "Payment must be verified before this order can move forward" });
        return;
      }
      if (["confirmed", "preparing"].includes(status) && !prescriptionIsApproved) {
        res.status(409).json({ error: "Prescription approval is required before this order can move forward" });
        return;
      }
      if (status === "preparing" && !["confirmed", "payment-verified", "preparing"].includes(existing.status)) {
        res.status(409).json({ error: "Confirm the order before starting preparation" });
        return;
      }
    }

    const [updated] = await db
      .update(ordersTable)
      .set({ status, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update order status");
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ── Generic JSONB-column merge helper ────────────────────────────────────────
async function mergeJsonbColumn(req: AuthenticatedRequest, res: Response, column: JsonbColumn): Promise<void> {
  const id = Number(req.params["id"]);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const patch = req.body as Record<string, unknown>;

  const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

  const admin = isAdminEmail(req.firebaseUser?.email);
  if (!admin && existing.customerId !== req.firebaseUser?.uid) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (!admin) {
    res.status(403).json({ error: "Only an admin can update order payment, delivery, or prescription details" });
    return;
  }

  const merged = { ...(existing[column] as Record<string, unknown>), ...patch };
  const [updated] = await db
    .update(ordersTable)
    .set({ [column]: merged, updatedAt: new Date() } as Partial<InsertOrder>)
    .where(eq(ordersTable.id, id))
    .returning();
  res.json(updated);
}

router.patch("/:id/payment", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await mergeJsonbColumn(req, res, "payment");
  } catch (err) {
    logger.error({ err }, "Failed to update order payment");
    res.status(500).json({ error: "Failed to update order payment" });
  }
});

router.patch("/:id/delivery", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await mergeJsonbColumn(req, res, "delivery");
  } catch (err) {
    logger.error({ err }, "Failed to update order delivery");
    res.status(500).json({ error: "Failed to update order delivery" });
  }
});

router.patch("/:id/prescription", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await mergeJsonbColumn(req, res, "prescription");
  } catch (err) {
    logger.error({ err }, "Failed to update order prescription");
    res.status(500).json({ error: "Failed to update order prescription" });
  }
});

// ── POST /api/orders/:id/prescription/review ───────────────────────────────────
// Separate admin review action for prescription orders. Approval can also
// release an order into the confirmed state once payment is already verified.
router.post("/:id/prescription/review", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    const { decision, reason } = req.body as { decision?: string; reason?: string };
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    if (decision !== "approved" && decision !== "rejected") {
      res.status(400).json({ error: "decision must be approved or rejected" });
      return;
    }
    if (!isAdminEmail(req.firebaseUser?.email)) {
      res.status(403).json({ error: "Forbidden: admin access required" });
      return;
    }

    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }
    const currentPrescription = (existing.prescription as Record<string, unknown>) ?? {};
    const approved = decision === "approved";
    const payment = (existing.payment as Record<string, unknown>) ?? {};
    const paymentIsVerified = ["paid", "verified", "completed"].includes(String(payment.status));
    const updatedPrescription = {
      ...currentPrescription,
      verified: approved,
      status: approved ? "approved" : "rejected",
      ...(approved
        ? { verifiedAt: new Date().toISOString(), rejectionReason: null }
        : { rejectionReason: String(reason ?? "").trim() || "Could not be verified" }),
      reviewedAt: new Date().toISOString(),
      reviewedBy: req.firebaseUser?.email ?? req.firebaseUser?.uid,
    };
    const nextStatus = approved && paymentIsVerified && ["payment-verified", "payment-verification-pending", "payment-pending"].includes(existing.status)
      ? "confirmed"
      : existing.status;

    const [updated] = await db
      .update(ordersTable)
      .set({ prescription: updatedPrescription, status: nextStatus, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to review order prescription");
    res.status(500).json({ error: "Failed to review prescription" });
  }
});

// ── PATCH /api/orders/:id/fields ──────────────────────────────────────────────
// Generic patch supporting dotted paths (e.g. "prescription.rejectionReason")
// against the JSONB sub-objects, plus plain top-level columns (notes/status).
// Mirrors the old Firestore updateOrderFields() call sites exactly.
router.patch("/:id/fields", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
    if (!existing) { res.status(404).json({ error: "Order not found" }); return; }

    const admin = isAdminEmail(req.firebaseUser?.email);
    if (!admin) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const fields = req.body as Record<string, unknown>;
    const jsonbPatches: Partial<Record<JsonbColumn, Record<string, unknown>>> = {};
    const topLevel: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(fields)) {
      const dotIdx = key.indexOf(".");
      if (dotIdx > 0) {
        const prefix = key.slice(0, dotIdx) as JsonbColumn;
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

    const updates: Record<string, unknown> = { ...topLevel, updatedAt: new Date() };
    for (const col of JSONB_COLUMNS) {
      if (jsonbPatches[col]) {
        updates[col] = { ...(existing[col] as Record<string, unknown>), ...jsonbPatches[col] };
      }
    }

    const [updated] = await db
      .update(ordersTable)
      .set(updates as Partial<InsertOrder>)
      .where(eq(ordersTable.id, id))
      .returning();
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update order fields");
    res.status(500).json({ error: "Failed to update order fields" });
  }
});

export default router;
