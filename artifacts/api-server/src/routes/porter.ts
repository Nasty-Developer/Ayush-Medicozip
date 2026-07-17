/**
 * Porter Delivery Routes — /api/porter
 *
 * Integrates with Porter's Delivery API for automated delivery booking.
 * All routes require admin authentication.
 *
 * POST /api/porter/estimate        → get delivery estimate/quote
 * POST /api/porter/book            → create a Porter delivery order
 * GET  /api/porter/track/:orderId  → get live tracking for a Porter order
 * POST /api/porter/cancel          → cancel a Porter order
 *
 * Environment variables required:
 *   PORTER_API_KEY   — from Porter Dashboard → API Keys
 *   PORTER_PICKUP_*  — store pickup address fields (optional, uses store settings fallback)
 *
 * When PORTER_API_KEY is not set, the routes return a 503 with a clear message
 * so the admin panel can display an appropriate UI state (not configured).
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail, type AuthenticatedRequest } from "../middlewares/authMiddleware";

const router = Router();

// ── Porter API base ───────────────────────────────────────────────────────────
const PORTER_API_BASE = "https://pfe-apigw-uat.porter.in"; // UAT; prod: https://api.porter.in

function getPorterKey(): string | null {
  return process.env["PORTER_API_KEY"] ?? null;
}

function porterHeaders() {
  const key = getPorterKey();
  if (!key) throw new Error("PORTER_API_KEY not configured");
  return {
    "Content-Type": "application/json",
    "x-api-key": key,
  };
}

// ── Store pickup address (hardcoded defaults, override via env) ───────────────
function storePickupAddress() {
  return {
    street: process.env["PORTER_PICKUP_STREET"] ?? "Shop 4, Rizvi Complex, Hill Road",
    city: process.env["PORTER_PICKUP_CITY"] ?? "Mumbai",
    state: process.env["PORTER_PICKUP_STATE"] ?? "Maharashtra",
    pincode: process.env["PORTER_PICKUP_PINCODE"] ?? "400050",
    lat: Number(process.env["PORTER_PICKUP_LAT"] ?? "19.0716"),
    lng: Number(process.env["PORTER_PICKUP_LNG"] ?? "72.8362"),
    contact: {
      name: process.env["PORTER_PICKUP_CONTACT_NAME"] ?? "Ayush Medico",
      phone: process.env["PORTER_PICKUP_PHONE"] ?? "9833273838",
    },
  };
}

function isConfigured() {
  return !!getPorterKey();
}

// ── POST /api/porter/estimate ──────────────────────────────────────────────────
router.post(
  "/estimate",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    if (!isConfigured()) {
      res.status(503).json({
        error: "Porter not configured",
        hint: "Set PORTER_API_KEY in environment secrets to enable delivery booking.",
        configured: false,
      });
      return;
    }

    const { orderDbId } = req.body as { orderDbId?: string };
    if (!orderDbId) {
      res.status(400).json({ error: "orderDbId is required" });
      return;
    }

    try {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderDbId)));
      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      const address = order.address as Record<string, unknown>;
      const pickup = storePickupAddress();

      const payload = {
        pickup_details: {
          lat: pickup.lat,
          lng: pickup.lng,
        },
        drop_details: {
          lat: address["lat"] ?? 19.076, // fallback to Mumbai center
          lng: address["lng"] ?? 72.877,
        },
        customer: {
          name: order.customerName,
          mobile: {
            country_code: "+91",
            number: String(address["mobileNumber"] ?? "").replace(/\D/g, "").slice(-10),
          },
        },
      };

      const response = await fetch(`${PORTER_API_BASE}/v1/get_quote`, {
        method: "POST",
        headers: porterHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        logger.error({ data }, "Porter estimate failed");
        res.status(502).json({ error: "Porter estimate failed", detail: data });
        return;
      }

      res.json({ configured: true, estimate: data });
    } catch (err) {
      logger.error({ err }, "POST /porter/estimate failed");
      res.status(500).json({ error: "Failed to get delivery estimate" });
    }
  }
);

// ── POST /api/porter/book ──────────────────────────────────────────────────────
router.post(
  "/book",
  requireAuth,
  requireAdminEmail,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!isConfigured()) {
      res.status(503).json({
        error: "Porter not configured",
        hint: "Set PORTER_API_KEY in environment secrets to enable delivery booking.",
        configured: false,
      });
      return;
    }

    const { orderDbId } = req.body as { orderDbId?: string };
    if (!orderDbId) {
      res.status(400).json({ error: "orderDbId is required" });
      return;
    }

    try {
      const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, Number(orderDbId)));
      if (!order) { res.status(404).json({ error: "Order not found" }); return; }

      const address = order.address as Record<string, unknown>;
      const pickup = storePickupAddress();
      const items = (order as unknown as { items?: Array<{ medicineName?: string; quantity?: number }> }).items ?? [];

      const payload = {
        request_id: order.orderId,
        delivery_instructions: {
          instructions_list: [
            { type: "text", description: `Order: ${order.orderId}. Handle with care — medicines.` },
          ],
        },
        pickup_details: {
          address: {
            apartment_address: pickup.street,
            street_address1: pickup.street,
            city: pickup.city,
            state: pickup.state,
            pincode: pickup.pincode,
            country: "India",
            lat: pickup.lat,
            lng: pickup.lng,
          },
          contact: {
            name: pickup.contact.name,
            mobile: { country_code: "+91", number: pickup.contact.phone },
          },
        },
        drop_details: {
          address: {
            apartment_address: [address["houseNumber"], address["buildingName"]].filter(Boolean).join(", "),
            street_address1: String(address["street"] ?? ""),
            street_address2: [address["area"], address["landmark"]].filter(Boolean).join(", "),
            city: String(address["city"] ?? "Mumbai"),
            state: String(address["state"] ?? "Maharashtra"),
            pincode: String(address["pincode"] ?? ""),
            country: "India",
            lat: Number(address["lat"] ?? 19.076),
            lng: Number(address["lng"] ?? 72.877),
          },
          contact: {
            name: String(address["fullName"] ?? order.customerName),
            mobile: {
              country_code: "+91",
              number: String(address["mobileNumber"] ?? "").replace(/\D/g, "").slice(-10),
            },
          },
        },
        additional_comments: `${items.map((i: { medicineName?: string; quantity?: number }) => `${i.medicineName ?? "Item"} ×${i.quantity ?? 1}`).join(", ")}`,
      };

      const response = await fetch(`${PORTER_API_BASE}/v1/orders`, {
        method: "POST",
        headers: porterHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json() as Record<string, unknown>;
      if (!response.ok) {
        logger.error({ data }, "Porter booking failed");
        res.status(502).json({ error: "Porter booking failed", detail: data });
        return;
      }

      // Store Porter order details in the DB order's delivery field
      const porterOrderId = String(data["order_id"] ?? "");
      const trackingUrl = String(data["tracking_url"] ?? "");

      await db
        .update(ordersTable)
        .set({
          delivery: {
            ...(order.delivery as Record<string, unknown>),
            status: "assigned",
            porterOrderId,
            trackingUrl: trackingUrl || undefined,
            bookedAt: new Date().toISOString(),
          },
          status: "delivery-assigned",
          updatedAt: new Date(),
        })
        .where(eq(ordersTable.id, Number(orderDbId)));

      logger.info({ orderDbId, porterOrderId }, "Porter delivery booked");
      res.json({ configured: true, success: true, porterOrderId, trackingUrl, raw: data });
    } catch (err) {
      logger.error({ err }, "POST /porter/book failed");
      res.status(500).json({ error: "Failed to book Porter delivery" });
    }
  }
);

// ── GET /api/porter/track/:porterOrderId ───────────────────────────────────────
router.get(
  "/track/:porterOrderId",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    if (!isConfigured()) {
      res.status(503).json({ error: "Porter not configured", configured: false });
      return;
    }

    const { porterOrderId } = req.params;
    if (!porterOrderId) { res.status(400).json({ error: "porterOrderId is required" }); return; }

    try {
      const response = await fetch(`${PORTER_API_BASE}/v1/orders/${encodeURIComponent(porterOrderId)}`, {
        headers: porterHeaders(),
      });

      const data = await response.json();
      if (!response.ok) {
        res.status(502).json({ error: "Failed to fetch Porter tracking", detail: data });
        return;
      }

      res.json({ configured: true, tracking: data });
    } catch (err) {
      logger.error({ err }, "GET /porter/track failed");
      res.status(500).json({ error: "Failed to fetch tracking" });
    }
  }
);

// ── POST /api/porter/cancel ────────────────────────────────────────────────────
router.post(
  "/cancel",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    if (!isConfigured()) {
      res.status(503).json({ error: "Porter not configured", configured: false });
      return;
    }

    const { porterOrderId, reason } = req.body as { porterOrderId?: string; reason?: string };
    if (!porterOrderId) { res.status(400).json({ error: "porterOrderId is required" }); return; }

    try {
      const response = await fetch(`${PORTER_API_BASE}/v1/orders/${encodeURIComponent(porterOrderId)}/cancel`, {
        method: "POST",
        headers: porterHeaders(),
        body: JSON.stringify({ cancellation_reason: reason ?? "Order cancelled by merchant" }),
      });

      const data = await response.json();
      if (!response.ok) {
        res.status(502).json({ error: "Failed to cancel Porter order", detail: data });
        return;
      }

      logger.info({ porterOrderId }, "Porter delivery cancelled");
      res.json({ configured: true, success: true, raw: data });
    } catch (err) {
      logger.error({ err }, "POST /porter/cancel failed");
      res.status(500).json({ error: "Failed to cancel Porter delivery" });
    }
  }
);

// ── POST /api/porter/webhook ───────────────────────────────────────────────────
// Porter sends status updates via webhook when delivery status changes.
// No signature verification documented by Porter yet — verify source IP in production.
router.post(
  "/webhook",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const event = req.body as Record<string, unknown>;
      const porterOrderId = String(event["order_id"] ?? "");
      const status = String(event["status"] ?? "");

      logger.info({ porterOrderId, status }, "Porter webhook received");

      // Map Porter status → our order status
      const statusMap: Record<string, string> = {
        "PICKED_UP": "out-for-delivery",
        "DELIVERED": "delivered",
        "CANCELLED": "cancelled",
        "FAILED": "returned",
      };

      const ourStatus = statusMap[status.toUpperCase()];
      if (ourStatus && porterOrderId) {
        // Find the order with this Porter order ID and update it
        const orders = await db.select().from(ordersTable);
        const matching = orders.find((o) => {
          const d = o.delivery as Record<string, unknown>;
          return d?.["porterOrderId"] === porterOrderId;
        });

        if (matching) {
          await db
            .update(ordersTable)
            .set({
              status: ourStatus,
              delivery: {
                ...(matching.delivery as Record<string, unknown>),
                status: status === "DELIVERED" ? "delivered" : status === "PICKED_UP" ? "out-for-delivery" : "failed",
                lastWebhookStatus: status,
                lastWebhookAt: new Date().toISOString(),
              },
              updatedAt: new Date(),
            })
            .where(eq(ordersTable.id, matching.id));

          logger.info({ orderId: matching.orderId, ourStatus }, "Order status updated from Porter webhook");
        }
      }

      res.json({ received: true });
    } catch (err) {
      logger.error({ err }, "POST /porter/webhook failed");
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

export default router;
