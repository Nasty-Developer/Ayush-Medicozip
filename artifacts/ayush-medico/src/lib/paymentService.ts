// Payment Service — Architecture for payment processing.
//
// Currently supports UPI (manual verification) and COD.
// Razorpay and Wallet are defined architecturally but not yet integrated.
//
// Future integration point for Razorpay:
//   1. Create Razorpay order via API server: POST /api/payments/razorpay/create
//   2. Open Razorpay checkout SDK in browser
//   3. On success, verify signature via API server: POST /api/payments/razorpay/verify
//   4. Call updatePaymentRecord() to mark verified

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PaymentMethod, PaymentStatus } from "./orderService";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentRecord = {
  id: string;
  orderId: string;
  orderDocId: string;
  customerId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  currency: "INR";
  upiTransactionId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

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

// ─── Firestore CRUD ───────────────────────────────────────────────────────────

export async function createPaymentRecord(input: {
  orderId: string;
  orderDocId: string;
  customerId: string;
  method: PaymentMethod;
  amount: number;
}): Promise<string> {
  if (!db) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(db, "payments"), {
    ...input,
    status: "pending" as PaymentStatus,
    currency: "INR",
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updatePaymentRecord(
  paymentDocId: string,
  data: Partial<Omit<PaymentRecord, "id" | "createdAt">>
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");
  await updateDoc(doc(db, "payments", paymentDocId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

// ─── UPI verification (admin-side) ───────────────────────────────────────────
// Admin manually enters the UPI transaction ID shown by the customer.
// paymentDocId is optional — if the separate payments collection was not used
// (current architecture), only the order document is updated.

export async function verifyUpiPayment(
  paymentDocId: string | null,
  orderDocId: string,
  upiTransactionId: string
): Promise<void> {
  if (!db) throw new Error("Firebase is not configured.");

  // Always update the order (source of truth for status)
  await updateDoc(doc(db, "orders", orderDocId), {
    "payment.status": "verified" as PaymentStatus,
    "payment.upiTransactionId": upiTransactionId,
    "payment.paidAt": Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  // Optionally update the separate payments collection if a doc exists
  if (paymentDocId) {
    await updateDoc(doc(db, "payments", paymentDocId), {
      status: "verified" as PaymentStatus,
      upiTransactionId,
      updatedAt: Timestamp.now(),
    });
  }
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
