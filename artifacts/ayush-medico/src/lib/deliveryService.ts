// Delivery Service — Abstraction layer for delivery provider integration.
//
// Currently all methods are placeholders.
// When Porter (or any other provider) is integrated, only this file changes.
// Call sites in OrdersPage, CheckoutPage, and orderService remain untouched.
//
// Future integration point:
//   import { PorterClient } from "@porter/sdk"; // or via API proxy
//   const porter = new PorterClient({ apiKey: process.env.PORTER_API_KEY });

import type { OrderAddress } from "./orderService";

export type DeliveryProvider = "porter" | "manual" | "in-house";

export type DeliveryEstimate = {
  provider: DeliveryProvider;
  estimatedMinutes: number;
  deliveryCharge: number;
  currency: "INR";
  available: boolean;
  unavailableReason?: string;
};

export type TrackingInfo = {
  status: string;
  partnerName?: string;
  partnerPhone?: string;
  trackingUrl?: string;
  estimatedArrivalMinutes?: number;
  events: Array<{ timestamp: number; description: string }>;
};

export type AssignedDelivery = {
  partnerId: string;
  partnerName: string;
  partnerPhone: string;
  providerOrderId?: string;
  trackingUrl?: string;
};

// ─── Placeholder implementations ──────────────────────────────────────────────

/**
 * Creates a delivery record with the provider.
 * FUTURE: calls Porter createOrder API.
 */
export async function createDelivery(params: {
  orderId: string;
  pickupAddress: OrderAddress;
  dropAddress: OrderAddress;
  items: Array<{ name: string; quantity: number }>;
}): Promise<{ providerOrderId: string }> {
  console.info("[DeliveryService] createDelivery — placeholder", params.orderId);
  // FUTURE: const response = await porter.createOrder({ ... });
  return { providerOrderId: `MANUAL-${params.orderId}` };
}

/**
 * Cancels a delivery with the provider.
 * FUTURE: calls Porter cancelOrder API.
 */
export async function cancelDelivery(params: {
  orderId: string;
  providerOrderId?: string;
  reason?: string;
}): Promise<void> {
  console.info("[DeliveryService] cancelDelivery — placeholder", params.orderId);
  // FUTURE: await porter.cancelOrder({ orderId: params.providerOrderId });
}

/**
 * Fetches live tracking info from the provider.
 * FUTURE: calls Porter getTracking API.
 */
export async function getTracking(params: {
  orderId: string;
  providerOrderId?: string;
}): Promise<TrackingInfo> {
  console.info("[DeliveryService] getTracking — placeholder", params.orderId);
  return {
    status: "not-assigned",
    events: [],
  };
}

/**
 * Estimates delivery time and cost for a given address.
 * FUTURE: calls Porter estimateQuote API.
 */
export async function estimateDelivery(params: {
  dropAddress: Pick<OrderAddress, "pincode" | "lat" | "lng">;
}): Promise<DeliveryEstimate> {
  console.info("[DeliveryService] estimateDelivery — placeholder", params.dropAddress.pincode);
  // FUTURE: const quote = await porter.getQuote({ ... });
  return {
    provider: "manual",
    estimatedMinutes: 45,
    deliveryCharge: 40,
    currency: "INR",
    available: true,
  };
}

/**
 * Assigns a delivery partner manually.
 * FUTURE: integrates with Porter's partner assignment or MediVision Gold roster.
 */
export async function assignDeliveryPartner(params: {
  orderId: string;
  partnerName: string;
  partnerPhone: string;
}): Promise<AssignedDelivery> {
  console.info("[DeliveryService] assignDeliveryPartner — placeholder", params.orderId);
  return {
    partnerId: `MANUAL-${Date.now()}`,
    partnerName: params.partnerName,
    partnerPhone: params.partnerPhone,
  };
}
