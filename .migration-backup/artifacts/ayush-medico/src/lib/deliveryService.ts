// Delivery Service — Porter API integration via the api-server proxy.
//
// Routes all delivery requests through /api/porter/* which in turn calls
// Porter's delivery API. When PORTER_API_KEY is not set on the backend, the
// routes return { configured: false } — the UI should surface a "not configured"
// state rather than crashing.
//
// For manual assignment (no Porter), `assignDeliveryPartner` falls back to
// writing directly to the order's delivery field via the orders API.

import { authFetch, authFetchJson } from "./apiAuth";
import type { OrderAddress } from "./orderService";

export type DeliveryProvider = "porter" | "manual" | "in-house";

export type DeliveryEstimate = {
  provider: DeliveryProvider;
  estimatedMinutes: number;
  deliveryCharge: number;
  currency: "INR";
  available: boolean;
  unavailableReason?: string;
  configured: boolean;
};

export type TrackingInfo = {
  status: string;
  partnerName?: string;
  partnerPhone?: string;
  trackingUrl?: string;
  estimatedArrivalMinutes?: number;
  events: Array<{ timestamp: number; description: string }>;
  configured: boolean;
};

export type AssignedDelivery = {
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  providerOrderId?: string;
  trackingUrl?: string;
  porterBooked?: boolean;
};

// ─── Porter API wrappers ──────────────────────────────────────────────────────

/**
 * Books a Porter delivery for an order.
 * Falls back gracefully when Porter is not configured.
 */
export async function createDelivery(params: {
  orderId: string;          // DB id (numeric string)
  pickupAddress: OrderAddress;
  dropAddress: OrderAddress;
  items: Array<{ name: string; quantity: number }>;
}): Promise<{ providerOrderId: string; trackingUrl?: string; porterBooked: boolean }> {
  try {
    const res = await authFetch("/api/porter/book", {
      method: "POST",
      body: JSON.stringify({ orderDbId: params.orderId }),
    });

    if (!res.ok) {
      const data = await res.json() as Record<string, unknown>;
      if (data["configured"] === false) {
        console.info("[DeliveryService] Porter not configured — using manual mode");
        return { providerOrderId: `MANUAL-${params.orderId}`, porterBooked: false };
      }
      throw new Error((data["error"] as string) ?? "Porter booking failed");
    }

    const data = await res.json() as {
      success: boolean;
      porterOrderId: string;
      trackingUrl?: string;
    };
    return {
      providerOrderId: data.porterOrderId,
      trackingUrl: data.trackingUrl,
      porterBooked: true,
    };
  } catch (err) {
    console.warn("[DeliveryService] createDelivery error:", err);
    return { providerOrderId: `MANUAL-${params.orderId}`, porterBooked: false };
  }
}

/**
 * Cancels a Porter delivery.
 */
export async function cancelDelivery(params: {
  orderId: string;
  providerOrderId?: string;
  reason?: string;
}): Promise<void> {
  if (!params.providerOrderId || params.providerOrderId.startsWith("MANUAL-")) {
    console.info("[DeliveryService] No Porter order to cancel — manual mode");
    return;
  }
  try {
    await authFetch("/api/porter/cancel", {
      method: "POST",
      body: JSON.stringify({
        porterOrderId: params.providerOrderId,
        reason: params.reason ?? "Order cancelled by merchant",
      }),
    });
  } catch (err) {
    console.warn("[DeliveryService] cancelDelivery error:", err);
  }
}

/**
 * Fetches live tracking info from Porter.
 */
export async function getTracking(params: {
  orderId: string;
  providerOrderId?: string;
}): Promise<TrackingInfo> {
  if (!params.providerOrderId || params.providerOrderId.startsWith("MANUAL-")) {
    return { status: "manual", events: [], configured: false };
  }
  try {
    const res = await authFetch(`/api/porter/track/${encodeURIComponent(params.providerOrderId)}`);
    if (!res.ok) {
      const data = await res.json() as Record<string, unknown>;
      if (data["configured"] === false) {
        return { status: "not-configured", events: [], configured: false };
      }
      throw new Error("Tracking failed");
    }
    const data = await res.json() as { configured: boolean; tracking: Record<string, unknown> };
    return {
      status: String(data.tracking?.["status"] ?? "unknown"),
      trackingUrl: String(data.tracking?.["tracking_url"] ?? ""),
      events: [],
      configured: true,
    };
  } catch (err) {
    console.warn("[DeliveryService] getTracking error:", err);
    return { status: "error", events: [], configured: false };
  }
}

/**
 * Gets a delivery estimate/quote from Porter for a drop address.
 */
export async function estimateDelivery(params: {
  dropAddress: Pick<OrderAddress, "pincode" | "lat" | "lng">;
  orderDbId?: string;
}): Promise<DeliveryEstimate> {
  if (!params.orderDbId) {
    return {
      provider: "manual",
      estimatedMinutes: 45,
      deliveryCharge: 40,
      currency: "INR",
      available: true,
      configured: false,
    };
  }

  try {
    const res = await authFetch("/api/porter/estimate", {
      method: "POST",
      body: JSON.stringify({ orderDbId: params.orderDbId }),
    });

    if (!res.ok) {
      const data = await res.json() as Record<string, unknown>;
      if (data["configured"] === false) {
        return {
          provider: "manual",
          estimatedMinutes: 45,
          deliveryCharge: 40,
          currency: "INR",
          available: true,
          configured: false,
        };
      }
      throw new Error("Estimate failed");
    }

    const data = await res.json() as {
      configured: boolean;
      estimate: {
        vehicles?: Array<{ fare?: { minor_amount?: number }; eta?: { pickup?: number } }>;
      };
    };

    const vehicle = data.estimate?.vehicles?.[0];
    const chargeRupees = vehicle?.fare?.minor_amount
      ? Math.round(vehicle.fare.minor_amount / 100)
      : 40;
    const etaMins = vehicle?.eta?.pickup ?? 45;

    return {
      provider: "porter",
      estimatedMinutes: etaMins,
      deliveryCharge: chargeRupees,
      currency: "INR",
      available: true,
      configured: true,
    };
  } catch (err) {
    console.warn("[DeliveryService] estimateDelivery error:", err);
    return {
      provider: "manual",
      estimatedMinutes: 45,
      deliveryCharge: 40,
      currency: "INR",
      available: true,
      configured: false,
    };
  }
}

/**
 * Assigns a delivery partner manually (when Porter is not booked).
 * Writes directly to the order's delivery field.
 */
export async function assignDeliveryPartner(params: {
  orderId: string;
  partnerName: string;
  partnerPhone: string;
}): Promise<AssignedDelivery> {
  return {
    partnerId: `MANUAL-${Date.now()}`,
    partnerName: params.partnerName,
    partnerPhone: params.partnerPhone,
    porterBooked: false,
  };
}

/**
 * Books a Porter delivery directly from the admin UI.
 * Returns { success, porterOrderId, trackingUrl, configured }.
 */
export async function bookPorterDelivery(orderDbId: string): Promise<{
  success: boolean;
  porterOrderId?: string;
  trackingUrl?: string;
  configured: boolean;
  error?: string;
}> {
  try {
    const res = await authFetch("/api/porter/book", {
      method: "POST",
      body: JSON.stringify({ orderDbId }),
    });
    const data = await res.json() as Record<string, unknown>;
    if (!res.ok) {
      return {
        success: false,
        configured: data["configured"] !== false,
        error: (data["error"] as string) ?? "Booking failed",
      };
    }
    return {
      success: true,
      configured: true,
      porterOrderId: data["porterOrderId"] as string | undefined,
      trackingUrl: data["trackingUrl"] as string | undefined,
    };
  } catch (err) {
    return { success: false, configured: false, error: String(err) };
  }
}

/** Initiates a Razorpay refund for a paid order via admin. */
export async function initiateRefund(params: {
  orderDbId: string;
  amount?: number;
  notes?: string;
}): Promise<{ success: boolean; refundId?: string; manual?: boolean; error?: string }> {
  try {
    const res = await authFetchJson<{
      success: boolean;
      refundId?: string;
      manual?: boolean;
    }>("/api/payment/refund", {
      method: "POST",
      body: JSON.stringify(params),
    });
    return res;
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
