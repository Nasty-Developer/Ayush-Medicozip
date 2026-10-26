/**
 * POST /api/notifications/whatsapp
 *
 * Dispatches a WhatsApp notification for an order event.
 * Called by the frontend after every status change.
 *
 * Body: { to, event, params }
 * Auth: Firebase ID token (requireAuth) — no admin restriction,
 *       because customers can trigger some events (e.g. order_placed, order_cancelled).
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { notificationsTable, ordersTable, type InsertNotification } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendWhatsAppMessage, type WhatsAppEvent } from "../lib/whatsappService.js";
import { logger } from "../lib/logger.js";
import { requireAuth, isAdminEmail, type AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const router = Router();

// ── POST /api/notifications ──────────────────────────────────────────────────
// Logs a notification intent to PostgreSQL (replaces the Firestore
// "notifications" collection write in the frontend's queueNotification()).
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as {
      orderId?: string;
      orderDocId?: number | string;
      customerId?: string;
      event?: string;
      eventLabel?: string;
      channels?: string[];
      metadata?: Record<string, unknown>;
    };
    if (!body.orderId || !body.customerId || !body.event) {
      res.status(400).json({ error: "orderId, customerId, and event are required" });
      return;
    }
    const admin = isAdminEmail(req.firebaseUser?.email);
    if (!admin && body.customerId !== req.firebaseUser?.uid) { res.status(403).json({ error: "Forbidden" }); return; }
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderId, body.orderId));
    if (!order || order.customerId !== body.customerId) { res.status(404).json({ error: "Order not found" }); return; }
    const customerEvents = ["order_placed", "order_cancelled"];
    if (!admin && !customerEvents.includes(body.event)) { res.status(403).json({ error: "Event not permitted" }); return; }
    const orderDbId = body.orderDocId != null ? Number(body.orderDocId) : null;
    const [created] = await db.insert(notificationsTable).values({
      orderId: body.orderId,
      orderDbId: orderDbId != null && !isNaN(orderDbId) ? orderDbId : null,
      customerId: body.customerId,
      event: body.event,
      eventLabel: body.eventLabel ?? null,
      channels: body.channels ?? [],
      status: "queued",
      metadata: body.metadata ?? {},
    } satisfies InsertNotification).returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "POST /notifications failed");
    res.status(500).json({ error: "Failed to queue notification" });
  }
});

router.post("/whatsapp", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { to, event, params, orderId } = req.body as {
    to?: string;
    event?: WhatsAppEvent;
    params?: Record<string, string>;
    orderId?: string;
  };

  if (!event || !orderId) {
    res.status(400).json({ error: "orderId and event are required" });
    return;
  }

  try {
    const [order] = await db.select().from(ordersTable).where(eq(ordersTable.orderId, orderId.trim().toUpperCase()));
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    const admin = isAdminEmail(req.firebaseUser?.email);
    if (!admin && order.customerId !== req.firebaseUser?.uid) { res.status(403).json({ error: "Forbidden" }); return; }
    if (!admin && !["order_placed", "order_cancelled"].includes(event)) {
      res.status(403).json({ error: "Event not permitted" }); return;
    }
    const destination = order.customerPhone;
    if (!destination) { res.status(409).json({ error: "Order has no customer phone number" }); return; }
    const result = await sendWhatsAppMessage({ to: destination, event, params: { ...(params ?? {}), orderId: order.orderId } });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[NotificationsRoute] Failed to send WhatsApp message");
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;
