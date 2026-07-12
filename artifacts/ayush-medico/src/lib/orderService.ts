// Order Service — SQL-backed CRUD for the Phase 2 cart-based order system.
// Talks to the api-server's /api/orders endpoints (PostgreSQL `orders` +
// `order_items` tables) instead of Firestore. Exported function names and
// shapes are kept identical to the previous Firestore implementation so
// call sites (CheckoutPage, OrderDetailPage, MyOrdersModal, admin
// OrdersPage) did not need to change.

import { authFetch, authFetchJson } from "./apiAuth";
import type { OrderStatus } from "./orderStatus";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PaymentMethod = "upi" | "cod" | "razorpay" | "wallet";
export type PaymentStatus = "pending" | "paid" | "verified" | "failed" | "refunded" | "completed";

export type DeliveryStatus =
  | "not-assigned"
  | "assigned"
  | "picked-up"
  | "out-for-delivery"
  | "delivered"
  | "failed";

// Lightweight Firestore-Timestamp-compatible shape — only `.seconds` is ever
// read anywhere in the app (no `.toDate()` usage), so a plain object works.
export type Timestamp = { seconds: number };

function toTimestamp(iso: string | null | undefined): Timestamp | undefined {
  if (!iso) return undefined;
  return { seconds: Math.floor(new Date(iso).getTime() / 1000) };
}

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
  id: string; // numeric SQL id, stringified (kept as `id` for URL/route compatibility)
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

// ─── Row → Order mapping ──────────────────────────────────────────────────────

type OrderRow = {
  id: number;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  address: OrderAddress;
  pricing: OrderPricing;
  payment: OrderPayment;
  prescription: OrderPrescription;
  delivery: OrderDelivery;
  status: string;
  notes: string | null;
  source: "website" | "app";
  createdAt: string;
  updatedAt: string;
  items?: (OrderItem & { id?: number; orderId?: number })[];
};

function mapRow(row: OrderRow): Order {
  return {
    id: String(row.id),
    orderId: row.orderId,
    customerId: row.customerId,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    address: row.address,
    items: (row.items ?? []).map((i) => ({
      medicineId: i.medicineId,
      medicineName: i.medicineName,
      categoryName: i.categoryName ?? undefined,
      brandName: i.brandName ?? undefined,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      totalPrice: Number(i.totalPrice),
      prescriptionRequired: i.prescriptionRequired,
    })),
    pricing: row.pricing,
    payment: row.payment,
    prescription: row.prescription,
    delivery: row.delivery,
    status: row.status as OrderStatus,
    notes: row.notes ?? undefined,
    source: row.source,
    createdAt: toTimestamp(row.createdAt)!,
    updatedAt: toTimestamp(row.updatedAt)!,
  };
}

// ─── Order ID generation ──────────────────────────────────────────────────────

export async function generateNewOrderId(): Promise<string> {
  const { orderId } = await authFetchJson<{ orderId: string }>("/api/orders/next-id");
  return orderId;
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────

export async function createOrder(input: CreateOrderInput): Promise<string> {
  const row = await authFetchJson<OrderRow>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return String(row.id);
}

export async function updateOrderStatus(
  docId: string,
  status: OrderStatus,
  _extra?: Record<string, unknown>
): Promise<void> {
  await authFetchJson(`/api/orders/${docId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export async function updateOrderPayment(
  docId: string,
  payment: Partial<OrderPayment>
): Promise<void> {
  await authFetchJson(`/api/orders/${docId}/payment`, {
    method: "PATCH",
    body: JSON.stringify(payment),
  });
}

export async function updateOrderDelivery(
  docId: string,
  delivery: Partial<OrderDelivery>
): Promise<void> {
  await authFetchJson(`/api/orders/${docId}/delivery`, {
    method: "PATCH",
    body: JSON.stringify(delivery),
  });
}

export async function updateOrderPrescription(
  docId: string,
  prescription: Partial<OrderPrescription>
): Promise<void> {
  await authFetchJson(`/api/orders/${docId}/prescription`, {
    method: "PATCH",
    body: JSON.stringify(prescription),
  });
}

export async function updateOrderFields(
  docId: string,
  fields: Record<string, unknown>
): Promise<void> {
  await authFetchJson(`/api/orders/${docId}/fields`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

export async function getOrderById(docId: string): Promise<Order | null> {
  const res = await authFetch(`/api/orders/${docId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
  return mapRow(await res.json());
}

export async function getOrderByOrderId(orderId: string): Promise<Order | null> {
  const res = await authFetch(`/api/orders/by-order-id/${encodeURIComponent(orderId)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
  return mapRow(await res.json());
}

// ─── Polling-based "subscriptions" ────────────────────────────────────────────
// Firestore's onSnapshot gave live updates; the SQL API is request/response,
// so these poll on an interval while preserving the same callback signature
// and an Unsubscribe-style cleanup function so existing call sites (which
// expect `() => void` back) keep working unchanged.

const POLL_INTERVAL_MS = 8000;

export function subscribeToOrder(
  docId: string,
  onData: (order: Order | null) => void,
  onError?: (err: Error) => void
): () => void {
  let cancelled = false;
  const tick = async () => {
    try {
      const order = await getOrderById(docId);
      if (!cancelled) onData(order);
    } catch (err) {
      if (!cancelled) onError?.(err as Error);
    }
  };
  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

export function subscribeToCustomerOrders(
  customerId: string,
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  let cancelled = false;
  const tick = async () => {
    try {
      const rows = await authFetchJson<OrderRow[]>(`/api/orders?customerId=${encodeURIComponent(customerId)}`);
      if (!cancelled) onData(rows.map(mapRow));
    } catch (err) {
      if (!cancelled) onError?.(err as Error);
    }
  };
  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}

// Admin: subscribe to all orders
export function subscribeToAllOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
): () => void {
  let cancelled = false;
  const tick = async () => {
    try {
      const rows = await authFetchJson<OrderRow[]>("/api/orders?limit=500");
      if (!cancelled) onData(rows.map(mapRow));
    } catch (err) {
      if (!cancelled) onError?.(err as Error);
    }
  };
  tick();
  const interval = setInterval(tick, POLL_INTERVAL_MS);
  return () => {
    cancelled = true;
    clearInterval(interval);
  };
}
