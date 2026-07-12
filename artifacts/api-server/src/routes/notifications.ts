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
import { notificationsTable, type InsertNotification } from "@workspace/db";
import { sendWhatsAppMessage, type WhatsAppEvent } from "../lib/whatsappService";
import { logger } from "../lib/logger";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/authMiddleware";

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

router.post("/whatsapp", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { to, event, params } = req.body as {
    to?: string;
    event?: WhatsAppEvent;
    params?: Record<string, string>;
  };

  if (!to || !event) {
    res.status(400).json({ error: "'to' and 'event' are required" });
    return;
  }

  try {
    const result = await sendWhatsAppMessage({ to, event, params: params ?? {} });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[NotificationsRoute] Failed to send WhatsApp message");
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;
