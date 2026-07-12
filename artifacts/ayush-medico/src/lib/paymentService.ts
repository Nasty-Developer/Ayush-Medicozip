// Payment Service — Architecture for payment processing.
//
// Currently supports UPI (manual verification) and COD.
// Razorpay and Wallet are defined architecturally but not yet integrated.
//
// Payment state now lives on the SQL `orders.payment` JSONB column
// (via /api/orders/:id/payment) instead of a separate Firestore "payments"
// collection — there was never a real consumer of that separate collection
// besides this file, so the standalone payment-record CRUD was dropped in
// favor of updating the order directly, which is what verifyUpiPayment
// already did as the source of truth.
//
// Future integration point for Razorpay:
//   1. Create Razorpay order via API server: POST /api/payments/razorpay/create
//   2. Open Razorpay checkout SDK in browser
//   3. On success, verify signature via API server: POST /api/payments/razorpay/verify
//   4. Call updateOrderPayment() to mark verified

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
    method: "upi",
    label: "UPI",
    description: "Pay via Google Pay, PhonePe, Paytm or any UPI app",
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
    method: "razorpay",
    label: "Card / Net Banking",
    description: "Credit/Debit Card, Net Banking via Razorpay",
    icon: "💳",
    available: false,
    unavailableReason: "Coming soon",
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
// `paymentDocId` is kept in the signature for call-site compatibility but is
// unused now that there is no separate payments table — the order's
// `payment` JSONB column is the single source of truth.

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

// ─── Razorpay (future) ────────────────────────────────────────────────────────
// FUTURE integration:
// export async function createRazorpayOrder(amount: number): Promise<{ id: string; amount: number }> {
//   const res = await fetch("/api/payments/razorpay/create", {
//     method: "POST",
//     body: JSON.stringify({ amount }),
//     headers: { "Content-Type": "application/json" },
//   });
//   return res.json();
// }
//
// export async function verifyRazorpayPayment(params: {
//   razorpayOrderId: string;
//   razorpayPaymentId: string;
//   razorpaySignature: string;
// }): Promise<boolean> {
//   const res = await fetch("/api/payments/razorpay/verify", {
//     method: "POST",
//     body: JSON.stringify(params),
//     headers: { "Content-Type": "application/json" },
//   });
//   const { verified } = await res.json();
//   return verified;
// }
