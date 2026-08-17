/**
 * Razorpay Payment Routes — TEST MODE
 *
 * POST /api/payment/create-razorpay-order  → creates Razorpay order, stores razorpayOrderId in DB
 * POST /api/payment/verify                 → verifies HMAC signature, marks order paid
 * POST /api/payment/failure                → records failed/dismissed payment
 * POST /api/payment/send-request           → admin only — creates Razorpay Payment Link for customer
 *
 * Security:
 *  • RAZORPAY_KEY_SECRET is NEVER sent to the browser
 *  • Signature verification uses HMAC-SHA256
 *  • All routes require authentication; send-request additionally requires admin email
 */

import { Router, type Request, type Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail, isAdminEmail, type AuthenticatedRequest } from "../middlewares/authMiddleware";

const router = Router();

// ── Razorpay client factory ───────────────────────────────────────────────────
// Built lazily so startup doesn't fail when keys are missing (e.g. in CI).
let _rzp: Razorpay | null = null;
function getRzp(): Razorpay {
  if (!_rzp) {
    const keyId = process.env.VITE_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      throw new Error("Razorpay credentials not configured. Set VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    }
    _rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return _rzp;
}

function getKeyId(): string {
  const keyId = process.env.VITE_RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("VITE_RAZORPAY_KEY_ID not set");
  return keyId;
}

// ── POST /api/payment/create-razorpay-order ───────────────────────────────────
router.post(
  "/create-razorpay-order",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { orderDbId } = req.body as { orderDbId?: string };
    if (!orderDbId) {
      res.status(400).json({ error: "orderDbId is required" });
      return;
    }

    try {
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderDbId)));

      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      // Only the order owner or an admin may create a payment for an order
      const isOwner = order.customerId === req.firebaseUser?.uid;
      const isAdmin = isAdminEmail(req.firebaseUser?.email);
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const rzp = getRzp();
      const amountPaise = Math.round(
        (order.pricing as Record<string, number>).grandTotal * 100
      );

      const rzpOrder = await rzp.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: order.orderId,
        notes: { orderDbId, orderId: order.orderId },
      } as Parameters<Razorpay["orders"]["create"]>[0]);

      // Store razorpayOrderId on the DB order so we can verify later
      const payment = { ...(order.payment as Record<string, unknown>), razorpayOrderId: rzpOrder.id };
      await db
        .update(ordersTable)
        .set({ payment, updatedAt: new Date() })
        .where(eq(ordersTable.id, Number(orderDbId)));

      res.json({
        razorpayOrderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: getKeyId(),
      });
    } catch (err) {
      logger.error({ err }, "POST /payment/create-razorpay-order failed");
      res.status(500).json({ error: "Failed to create Razorpay order" });
    }
  }
);

// ── POST /api/payment/verify ──────────────────────────────────────────────────
router.post(
  "/verify",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const {
      orderDbId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body as {
      orderDbId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!orderDbId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: "orderDbId, razorpay_order_id, razorpay_payment_id and razorpay_signature are required" });
      return;
    }

    try {
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET not set");

      // HMAC-SHA256 verification — Razorpay standard
      const body = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected = crypto
        .createHmac("sha256", keySecret)
        .update(body)
        .digest("hex");

      if (expected !== razorpay_signature) {
        logger.warn({ orderDbId }, "Razorpay signature mismatch — possible tampering");
        res.status(400).json({ error: "Payment verification failed: invalid signature" });
        return;
      }

      // Signature valid — mark order as paid
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderDbId)));

      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      // Ownership check (customer verifying their own payment OR admin)
      const isOwner = order.customerId === req.firebaseUser?.uid;
      const isAdmin = isAdminEmail(req.firebaseUser?.email);
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const payment = {
        ...(order.payment as Record<string, unknown>),
        status: "paid",
        razorpayPaymentId: razorpay_payment_id,
        paidAt: new Date().toISOString(),
      };

      const [updated] = await db
        .update(ordersTable)
        .set({ payment, status: "payment-verified", updatedAt: new Date() })
        .where(eq(ordersTable.id, Number(orderDbId)))
        .returning();

      logger.info({ orderDbId, razorpay_payment_id }, "Razorpay payment verified and order marked paid");
      res.json({ success: true, order: updated });
    } catch (err) {
      logger.error({ err }, "POST /payment/verify failed");
      res.status(500).json({ error: "Failed to verify payment" });
    }
  }
);

// ── POST /api/payment/failure ─────────────────────────────────────────────────
router.post(
  "/failure",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { orderDbId } = req.body as { orderDbId?: string };
    if (!orderDbId) {
      res.status(400).json({ error: "orderDbId is required" });
      return;
    }

    try {
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderDbId)));

      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      const isOwner = order.customerId === req.firebaseUser?.uid;
      const isAdmin = isAdminEmail(req.firebaseUser?.email);
      if (!isOwner && !isAdmin) {
        res.status(403).json({ error: "Forbidden" });
        return;
      }

      const payment = {
        ...(order.payment as Record<string, unknown>),
        status: "failed",
        failedAt: new Date().toISOString(),
      };

      await db
        .update(ordersTable)
        .set({ payment, status: "payment-pending", updatedAt: new Date() })
        .where(eq(ordersTable.id, Number(orderDbId)));

      logger.info({ orderDbId }, "Razorpay payment marked as failed/dismissed");
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "POST /payment/failure failed");
      res.status(500).json({ error: "Failed to record payment failure" });
    }
  }
);

// ── POST /api/payment/send-request ────────────────────────────────────────────
// Admin only — creates a Razorpay Payment Link and returns the short URL so the
// admin can share it with the customer (e.g. via WhatsApp).
router.post(
  "/send-request",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    const { orderDbId } = req.body as { orderDbId?: string };
    if (!orderDbId) {
      res.status(400).json({ error: "orderDbId is required" });
      return;
    }

    try {
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderDbId)));

      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      const rzp = getRzp();
      const pricing = order.pricing as Record<string, number>;
      const amountPaise = Math.round(pricing.grandTotal * 100);

      const link = await rzp.paymentLink.create({
        amount: amountPaise,
        currency: "INR",
        description: `Ayush Medico — Payment for Order ${order.orderId}`,
        customer: {
          name: order.customerName,
          contact: order.customerPhone,
          ...(order.customerEmail ? { email: order.customerEmail } : {}),
        },
        notify: { sms: false, email: false }, // admin sends manually via WhatsApp
        reminder_enable: false,
        notes: { orderId: order.orderId, orderDbId },
        // Expires in 24 hours
        expire_by: Math.floor(Date.now() / 1000) + 86400,
      } as Parameters<Razorpay["paymentLink"]["create"]>[0]);

      logger.info({ orderDbId, linkId: link.id }, "Razorpay payment link created");
      res.json({ url: link.short_url, linkId: link.id });
    } catch (err) {
      logger.error({ err }, "POST /payment/send-request failed");
      res.status(500).json({ error: "Failed to create payment link" });
    }
  }
);

// ── POST /api/payment/webhook ─────────────────────────────────────────────────
// Razorpay sends async payment events here. Verify with RAZORPAY_WEBHOOK_SECRET.
// Note: app.ts mounts express.raw() for this path so we get the raw body needed
// for HMAC verification.
router.post(
  "/webhook",
  async (req: Request, res: Response): Promise<void> => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      logger.warn("RAZORPAY_WEBHOOK_SECRET not set — webhook verification skipped (unsafe)");
    }

    // Verify signature when secret is configured
    if (secret) {
      const signature = req.headers["x-razorpay-signature"] as string | undefined;
      if (!signature) {
        res.status(400).json({ error: "Missing x-razorpay-signature header" });
        return;
      }

      // req.body is a Buffer because app.ts uses express.raw() for this path
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
      const expected = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      if (expected !== signature) {
        logger.warn("Razorpay webhook signature mismatch");
        res.status(400).json({ error: "Invalid webhook signature" });
        return;
      }
    }

    // Parse event
    let event: Record<string, unknown>;
    try {
      const rawBody = Buffer.isBuffer(req.body) ? req.body.toString() : JSON.stringify(req.body);
      event = JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }

    const eventType = event["event"] as string | undefined;
    const payload = (event["payload"] as Record<string, unknown>) ?? {};
    logger.info({ eventType }, "Razorpay webhook received");

    try {
      if (eventType === "payment.captured" || eventType === "payment_link.paid") {
        // Extract order notes to find our DB order
        const paymentEntity = (
          (payload["payment"] as Record<string, unknown> | undefined)?.["entity"] as Record<string, unknown> | undefined
        ) ?? {};
        const notes = (paymentEntity["notes"] as Record<string, unknown>) ?? {};
        const orderDbId = notes["orderDbId"] as string | undefined;
        const razorpay_payment_id = paymentEntity["id"] as string | undefined;
        const razorpay_order_id = paymentEntity["order_id"] as string | undefined;

        if (orderDbId && razorpay_payment_id) {
          const [order] = await db
            .select()
            .from(ordersTable)
            .where(eq(ordersTable.id, Number(orderDbId)));

          if (order && order.status !== "payment-verified" && order.status !== "delivered") {
            const payment = {
              ...(order.payment as Record<string, unknown>),
              status: "paid",
              razorpayPaymentId: razorpay_payment_id,
              razorpayOrderId: razorpay_order_id ?? (order.payment as Record<string, unknown>)["razorpayOrderId"],
              paidAt: new Date().toISOString(),
              webhookVerified: true,
            };
            await db
              .update(ordersTable)
              .set({ payment, status: "payment-verified", updatedAt: new Date() })
              .where(eq(ordersTable.id, Number(orderDbId)));
            logger.info({ orderDbId, razorpay_payment_id }, "Webhook: order marked payment-verified");
          }
        }
      }

      if (eventType === "payment.failed") {
        const paymentEntity = (
          (payload["payment"] as Record<string, unknown> | undefined)?.["entity"] as Record<string, unknown> | undefined
        ) ?? {};
        const notes = (paymentEntity["notes"] as Record<string, unknown>) ?? {};
        const orderDbId = notes["orderDbId"] as string | undefined;
        if (orderDbId) {
          const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderDbId)));
          if (order) {
            const payment = {
              ...(order.payment as Record<string, unknown>),
              status: "failed",
              failedAt: new Date().toISOString(),
              webhookVerified: true,
            };
            await db
              .update(ordersTable)
              .set({ payment, status: "payment-pending", updatedAt: new Date() })
              .where(eq(ordersTable.id, Number(orderDbId)));
            logger.info({ orderDbId }, "Webhook: order marked payment-failed");
          }
        }
      }

      res.json({ status: "ok" });
    } catch (err) {
      logger.error({ err }, "Razorpay webhook processing error");
      // Always return 200 to Razorpay so it doesn't retry indefinitely
      res.json({ status: "error", message: "Processing failed but acknowledged" });
    }
  }
);

// ── POST /api/payment/refund ───────────────────────────────────────────────────
// Admin only — initiates a Razorpay refund for a paid order.
// The order must have a razorpayPaymentId to refund via API.
// For COD/UPI orders, use the "Mark Refunded" button (no API call needed).
router.post(
  "/refund",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    const { orderDbId, amount, notes } = req.body as {
      orderDbId?: string;
      amount?: number;          // refund amount in ₹ (not paise). Null = full refund.
      notes?: string;
    };

    if (!orderDbId) {
      res.status(400).json({ error: "orderDbId is required" });
      return;
    }

    try {
      const [order] = await db
        .select()
        .from(ordersTable)
        .where(eq(ordersTable.id, Number(orderDbId)));

      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      const payment = order.payment as Record<string, unknown>;
      const razorpayPaymentId = payment["razorpayPaymentId"] as string | undefined;

      if (!razorpayPaymentId) {
        // For non-Razorpay payments (COD, UPI), just mark as refunded without API call
        const updatedPayment = { ...payment, status: "refunded", refundedAt: new Date().toISOString() };
        const [updated] = await db
          .update(ordersTable)
          .set({ payment: updatedPayment, status: "refunded", updatedAt: new Date() })
          .where(eq(ordersTable.id, Number(orderDbId)))
          .returning();
        logger.info({ orderDbId }, "Non-Razorpay order marked refunded (manual)");
        res.json({ success: true, manual: true, order: updated });
        return;
      }

      // Initiate Razorpay refund via API
      const rzp = getRzp();
      const pricing = order.pricing as Record<string, number>;
      const refundPaise = amount
        ? Math.round(amount * 100)
        : Math.round(pricing.grandTotal * 100);

      const refund = await (rzp as unknown as {
        payments: {
          refund: (id: string, opts: Record<string, unknown>) => Promise<Record<string, unknown>>;
        };
      }).payments.refund(razorpayPaymentId, {
        amount: refundPaise,
        speed: "normal",
        notes: { reason: notes ?? "Admin-initiated refund", orderId: order.orderId },
      });

      const updatedPayment = {
        ...payment,
        status: "refunded",
        refundId: refund["id"],
        refundedAt: new Date().toISOString(),
        refundAmount: amount ?? pricing.grandTotal,
      };

      const [updated] = await db
        .update(ordersTable)
        .set({ payment: updatedPayment, status: "refunded", updatedAt: new Date() })
        .where(eq(ordersTable.id, Number(orderDbId)))
        .returning();

      logger.info({ orderDbId, refundId: refund["id"] }, "Razorpay refund initiated");
      res.json({ success: true, refundId: refund["id"], order: updated });
    } catch (err) {
      logger.error({ err }, "POST /payment/refund failed");
      res.status(500).json({ error: "Failed to initiate refund" });
    }
  }
);

export default router;
