// Payment Service — Razorpay (TEST MODE) only.
//
// COD and manual UPI are intentionally disabled.
// All payments go through the Razorpay Secure Checkout modal.
//
// Architecture:
//   1. POST /api/payment/create-razorpay-order  → get Razorpay order ID + params
//   2. Open Razorpay checkout modal (browser SDK loaded from CDN)
//   3. On success → POST /api/payment/verify     → HMAC verification, DB updated
//         order.status       = "payment-verified"
//         payment.status     = "paid"
//   4. On failure/dismiss → POST /api/payment/failure → DB marks payment-pending
//         customer can retry via "Pay Now" on the Order Detail page

import { authFetchJson } from "./apiAuth";
import type { PaymentStatus, OrderPayment } from "./orderService";

// ─── Admin: UPI verification helper (kept for existing UPI orders) ─────────────

export async function verifyUpiPayment(
  _paymentDocId: string | null,
  orderDocId: string,
  upiTransactionId: string
): Promise<void> {
  await authFetchJson(`/api/orders/${orderDocId}/payment`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "verified" as PaymentStatus,
      upiTransactionId,
      paidAt: new Date().toISOString(),
    } satisfies Partial<OrderPayment>),
  });
}

// ─── Razorpay API helpers ─────────────────────────────────────────────────────

export type RazorpayOrderResponse = {
  razorpayOrderId: string;
  amount: number;    // in paise
  currency: string;
  keyId: string;     // safe to expose in browser (like Stripe publishable key)
};

/** Creates a Razorpay order on the backend and returns checkout params. */
export async function createRazorpayOrder(params: {
  orderDbId: string;
}): Promise<RazorpayOrderResponse> {
  return authFetchJson<RazorpayOrderResponse>("/api/payment/create-razorpay-order", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Verifies the Razorpay HMAC signature on the backend and marks the order paid. */
export async function verifyRazorpayPayment(params: {
  orderDbId: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<void> {
  await authFetchJson("/api/payment/verify", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/** Records a failed or dismissed Razorpay payment. Order stays at payment-pending. */
export async function reportRazorpayFailure(orderDbId: string): Promise<void> {
  await authFetchJson("/api/payment/failure", {
    method: "POST",
    body: JSON.stringify({ orderDbId }),
  });
}

/** Admin: creates a Razorpay Payment Link for a specific order. Returns short URL. */
export async function createRazorpayPaymentLink(
  orderDbId: string | number
): Promise<{ url: string; linkId: string }> {
  return authFetchJson("/api/payment/send-request", {
    method: "POST",
    body: JSON.stringify({ orderDbId: String(orderDbId) }),
  });
}
