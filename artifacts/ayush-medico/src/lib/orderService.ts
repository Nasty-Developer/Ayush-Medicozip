// Order Service — Firestore CRUD for the `orders` collection.
// This is the Phase 2 order system for cart-based checkout.
// The existing prescription-based "inquiries" collection is NOT touched here.

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";
import type { OrderStatus } from "./orderStatus";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethod = "upi" | "cod" | "razorpay" | "wallet";
export type PaymentStatus = "pending" | "verified" | "failed" | "refunded" | "completed";

export type DeliveryStatus =
  | "not-assigned"
  | "assigned"
  | "picked-up"
  | "out-for-delivery"
  | "delivered"
  | "failed";

export type OrderAddress = {
  fullName: string;
  mobileNumber: string;
  alternateNumber?: string;
  houseNumber: string;
  buildingName?: string;
  street: string;
  area?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  addressType: "home" | "work" | "other";
  lat?: number | null;
  lng?: number | null;
};

export type OrderItem = {
  medicineId: string;
  medicineName: string;
  categoryName?: string;
  brandName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  prescriptionRequired: boolean;
};

export type OrderPricing = {
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  gst: number;
  grandTotal: number;
  couponCode?: string | null;
};

export type OrderPayment = {
  method: PaymentMethod;
  status: PaymentStatus;
  upiTransactionId?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  paidAt?: Timestamp | null;
};

export type OrderPrescription = {
  required: boolean;
  url?: string | null;
  verified: boolean;
  verifiedAt?: Timestamp | null;
};

export type OrderDelivery = {
  status: DeliveryStatus;
  partnerId?: string | null;
  partnerName?: string | null;
  partnerPhone?: string | null;
  trackingId?: string | null;
  trackingUrl?: string | null;
  estimatedAt?: Timestamp | null;
  deliveredAt?: Timestamp | null;
};

export type Order = {
  id: string; // Firestore document ID
  orderId: string; // AYM-YYYY-NNNNNN
  customerId: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone: string;
  address: OrderAddress;
  items: OrderItem[];
  pricing: OrderPricing;
  payment: OrderPayment;
  prescription: OrderPrescription;
  delivery: OrderDelivery;
  status: OrderStatus;
  notes?: string;
  source: "website" | "app";
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type CreateOrderInput = Omit<Order, "id" | "createdAt" | "updatedAt">;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function assertDb(): NonNullable<typeof db> {
  if (!db) throw new Error("Firebase is not configured.");
  return db;
}

// ─── Order ID generation ──────────────────────────────────────────────────────
// Generates AYM-YYYY-NNNNNN from the `orders` collection (not `inquiries`).

const ORDER_PREFIX = "AYM";

async function getNextOrderSequence(database: NonNullable<typeof db>): Promise<number> {
  const year = new Date().getFullYear();
  const q = query(
    collection(database, "orders"),
    where("orderId", ">=", `${ORDER_PREFIX}-${year}-000000`),
    where("orderId", "<=", `${ORDER_PREFIX}-${year}-999999`),
    orderBy("orderId", "desc"),
    limit(1)
  );
  try {
    const snap = await getDocs(q);
    if (snap.empty) return 1;
    const lastId: string = snap.docs[0].data().orderId as string;
    const match = lastId.match(/(\d{6})$/);
    return match ? parseInt(match[1], 10) + 1 : 1;
  } catch {
    return Math.floor(Date.now() / 1000) % 1000000;
  }
}

export async function generateNewOrderId(): Promise<string> {
  const database = assertDb();
  const year = new Date().getFullYear();
  const seq = await getNextOrderSequence(database);
  return `${ORDER_PREFIX}-${year}-${String(seq).padStart(6, "0")}`;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const database = assertDb();
  const ref = await addDoc(collection(database, "orders"), {
    ...input,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return ref.id;
}

export async function updateOrderStatus(
  docId: string,
  status: OrderStatus,
  extra?: Record<string, unknown>
): Promise<void> {
  const database = assertDb();
  await updateDoc(doc(database, "orders", docId), {
    status,
    updatedAt: Timestamp.now(),
    ...(extra ?? {}),
  });
}

export async function updateOrderPayment(
  docId: string,
  payment: Partial<OrderPayment>
): Promise<void> {
  const database = assertDb();
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const [k, v] of Object.entries(payment)) {
    updates[`payment.${k}`] = v;
  }
  await updateDoc(doc(database, "orders", docId), updates);
}

export async function updateOrderDelivery(
  docId: string,
  delivery: Partial<OrderDelivery>
): Promise<void> {
  const database = assertDb();
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const [k, v] of Object.entries(delivery)) {
    updates[`delivery.${k}`] = v;
  }
  await updateDoc(doc(database, "orders", docId), updates);
}

export async function updateOrderPrescription(
  docId: string,
  prescription: Partial<OrderPrescription>
): Promise<void> {
  const database = assertDb();
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const [k, v] of Object.entries(prescription)) {
    updates[`prescription.${k}`] = v;
  }
  await updateDoc(doc(database, "orders", docId), updates);
}

export async function updateOrderFields(
  docId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const database = assertDb();
  await updateDoc(doc(database, "orders", docId), {
    ...fields,
    updatedAt: Timestamp.now(),
  });
}

export async function getOrderById(docId: string): Promise<Order | null> {
  const database = assertDb();
  const snap = await getDoc(doc(database, "orders", docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

export async function getOrderByOrderId(orderId: string): Promise<Order | null> {
  const database = assertDb();
  const q = query(
    collection(database, "orders"),
    where("orderId", "==", orderId),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Order;
}

// ─── Real-time subscriptions ──────────────────────────────────────────────────

export function subscribeToOrder(
  docId: string,
  onData: (order: Order | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    setTimeout(() => onData(null), 0);
    return () => {};
  }
  return onSnapshot(
    doc(db, "orders", docId),
    (snap) => onData(snap.exists() ? ({ id: snap.id, ...snap.data() } as Order) : null),
    onError
  );
}

export function subscribeToCustomerOrders(
  customerId: string,
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    setTimeout(() => onData([]), 0);
    return () => {};
  }
  const q = query(
    collection(db, "orders"),
    where("customerId", "==", customerId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      onData(orders);
    },
    onError
  );
}

// Admin: subscribe to all orders
export function subscribeToAllOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db) {
    setTimeout(() => onData([]), 0);
    return () => {};
  }
  return onSnapshot(
    collection(db, "orders"),
    (snap) => {
      const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Order))
        .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0));
      onData(orders);
    },
    onError
  );
}
