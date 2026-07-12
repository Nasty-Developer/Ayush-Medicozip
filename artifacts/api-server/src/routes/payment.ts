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

export default router;
