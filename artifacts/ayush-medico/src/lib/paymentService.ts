// Payment Service — Razorpay (TEST MODE) + UPI (manual) + COD.
//
// Architecture:
//   Razorpay:
//     1. POST /api/payment/create-razorpay-order  → get Razorpay order ID
//     2. Open Razorpay checkout modal (browser SDK)
//     3. On success → POST /api/payment/verify     → HMAC verification, DB updated
//     4. On failure → POST /api/payment/failure    → DB marks payment-pending
//   UPI (manual):
//     Admin manually verifies UTR → POST /api/orders/:id/payment { status: "verified" }
//   COD:
//     No payment action needed at order time.

import { authFetchJson } from "./apiAuth";
import type { PaymentMethod, PaymentStatus, OrderPayment } from "./orderService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethodConfig = {
  method: PaymentMethod;
  label: string;
  description: string;
  icon: string;
  available: boolean;
  unavailableReason?: string;
};

// ─── Payment method configuration ────────────────────────────────────────────

export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    method: "razorpay",
    label: "Card / Net Banking / UPI",
    description: "Credit/Debit Card, Net Banking, or any UPI app — powered by Razorpay",
    icon: "💳",
    available: true,
  },
  {
    method: "upi",
    label: "UPI (Direct to Store)",
    description: "Pay directly to our UPI ID and share transaction ID",
    icon: "📱",
    available: true,
  },
  {
    method: "cod",
    label: "Cash on Delivery",
    description: "Pay in cash when your order arrives",
    icon: "💵",
    available: true,
  },
  {
    method: "wallet",
    label: "Wallet",
    description: "Pay from your Ayush Medico wallet balance",
    icon: "👛",
    available: false,
    unavailableReason: "Coming soon",
  },
];

// ─── UPI details ──────────────────────────────────────────────────────────────

export const STORE_UPI_ID = "ayushmedico@upi"; // Replace with actual UPI ID
export const STORE_UPI_NAME = "Ayush Medico";

// ─── UPI verification (admin-side) ───────────────────────────────────────────
// Admin manually enters the UPI transaction ID shown by the customer.

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
  amount: number;       // in paise
  currency: string;
  keyId: string;        // Razorpay key_id — safe to use in browser
};

/** Creates a Razorpay order on the backend and returns the checkout params. */
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

/** Records a failed/dismissed Razorpay payment. Order stays at payment-pending. */
export async function reportRazorpayFailure(orderDbId: string): Promise<void> {
  await authFetchJson("/api/payment/failure", {
    method: "POST",
    body: JSON.stringify({ orderDbId }),
  });
}

/** Admin: creates a Razorpay Payment Link for a specific order. Returns { url }. */
export async function createRazorpayPaymentLink(orderDbId: string): Promise<{ url: string; linkId: string }> {
  return authFetchJson("/api/payment/send-request", {
    method: "POST",
    body: JSON.stringify({ orderDbId }),
  });
}
