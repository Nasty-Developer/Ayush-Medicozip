// Shared order-status pipeline definitions — the single source of truth for
// status keys, display labels, and pipeline ordering used by BOTH the admin
// dashboard (MedicineRequestsPage) and the customer-facing OrderTracker page.
//
// Keeping this centralized means Firestore is the only source of truth for
// *data*, and this file is the only source of truth for how that data is
// *labeled and ordered* — so the two surfaces never drift out of sync.

export type RequestStatus =
  | "new"
  | "pending-verification"
  | "accepted"
  | "medicine-reserved"
  | "payment-pending"
  | "payment-received"
  | "preparing"
  | "out-for-delivery"
  | "delivered"
  | "rejected"
  | "medicine-unavailable"
  | "cancelled";

// The linear, positive-path pipeline a healthy order progresses through.
export const STATUS_PIPELINE: RequestStatus[] = [
  "new",
  "pending-verification",
  "accepted",
  "medicine-reserved",
  "payment-pending",
  "payment-received",
  "preparing",
  "out-for-delivery",
  "delivered",
];

// Terminal statuses that can occur instead of continuing the pipeline.
export const NEGATIVE_STATUSES: RequestStatus[] = [
  "cancelled",
  "rejected",
  "medicine-unavailable",
];

export const ALL_STATUSES: RequestStatus[] = [
  ...STATUS_PIPELINE,
  ...NEGATIVE_STATUSES,
];

// Customer/admin-facing display labels — internal keys stay stable (so
// existing Firestore documents and code paths keep working) while the
// wording shown on screen matches the spec's pipeline naming.
export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: "Request Submitted",
  "pending-verification": "Prescription Under Review",
  accepted: "Prescription Verified",
  "medicine-reserved": "Medicine Reserved",
  "payment-pending": "Payment Pending",
  "payment-received": "Payment Received",
  preparing: "Packing",
  "out-for-delivery": "Out For Delivery",
  delivered: "Delivered",
  rejected: "Rejected",
  "medicine-unavailable": "Medicine Unavailable",
  cancelled: "Cancelled",
};

export function isNegativeStatus(status: string): boolean {
  return (NEGATIVE_STATUSES as string[]).includes(status);
}

export function getPipelineIndex(status: string): number {
  return STATUS_PIPELINE.indexOf(status as RequestStatus);
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status as RequestStatus] ?? status;
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase 2: OrderStatus — for the cart-based checkout order flow.
// Separate from RequestStatus (prescription-based inquiries) so the two flows
// never share a status key and existing code stays completely unchanged.
// ─────────────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending"             // Order placed, awaiting confirmation
  | "payment-pending"     // Waiting for payment
  | "payment-verified"    // Payment confirmed
  | "preparing"           // Being packed at pharmacy
  | "packed"              // Packing complete
  | "ready-for-pickup"    // Awaiting delivery partner pickup
  | "delivery-assigned"   // Delivery partner assigned
  | "out-for-delivery"    // On the way
  | "delivered"           // Successfully delivered
  | "cancelled"           // Cancelled before dispatch
  | "returned"            // Returned after delivery attempt
  | "refunded";           // Refund issued

export const ORDER_STATUS_PIPELINE: OrderStatus[] = [
  "pending",
  "payment-pending",
  "payment-verified",
  "preparing",
  "packed",
  "ready-for-pickup",
  "delivery-assigned",
  "out-for-delivery",
  "delivered",
];

export const ORDER_NEGATIVE_STATUSES: OrderStatus[] = [
  "cancelled",
  "returned",
  "refunded",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending:              "Order Placed",
  "payment-pending":    "Payment Pending",
  "payment-verified":   "Payment Verified",
  preparing:            "Preparing Order",
  packed:               "Order Packed",
  "ready-for-pickup":   "Ready for Pickup",
  "delivery-assigned":  "Delivery Assigned",
  "out-for-delivery":   "Out for Delivery",
  delivered:            "Delivered",
  cancelled:            "Cancelled",
  returned:             "Returned",
  refunded:             "Refunded",
};

export function getOrderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as OrderStatus] ?? status;
}

export function isNegativeOrderStatus(status: string): boolean {
  return (ORDER_NEGATIVE_STATUSES as string[]).includes(status);
}

export function getOrderPipelineIndex(status: string): number {
  return ORDER_STATUS_PIPELINE.indexOf(status as OrderStatus);
}

/** True when the customer can still cancel (before preparation starts). */
export function canCustomerCancel(status: OrderStatus): boolean {
  return ["pending", "payment-pending"].includes(status);
}
