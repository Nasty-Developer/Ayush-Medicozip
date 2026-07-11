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
import { sendWhatsAppMessage, type WhatsAppEvent } from "../lib/whatsappService";
import { logger } from "../lib/logger";
import { requireAuth } from "../middlewares/authMiddleware";

const router = Router();

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
