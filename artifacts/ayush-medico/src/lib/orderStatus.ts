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
