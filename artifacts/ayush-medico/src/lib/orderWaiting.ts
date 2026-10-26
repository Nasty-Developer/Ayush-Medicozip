// Helpers for the "waiting on pharmacy" experience shown on Track Order and
// My Orders: a lightweight banner while an order sits unreviewed, escalating
// to a WhatsApp-assistance prompt if it's been waiting too long.

const URGENT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export type WaitingOrderInfo = {
  status: string;
  createdAt?: { seconds: number } | null;
};

// Statuses where the pharmacy has not yet acted on the order at all.
const UNREVIEWED_STATUSES = new Set(["new", "pending-verification"]);

export function isWaitingForReview(order: WaitingOrderInfo): boolean {
  return UNREVIEWED_STATUSES.has(order.status);
}

export function needsUrgentAssistance(order: WaitingOrderInfo): boolean {
  if (!isWaitingForReview(order)) return false;
  const createdMs = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : null;
  if (!createdMs) return false;
  return Date.now() - createdMs > URGENT_THRESHOLD_MS;
}

const SUPPORT_WHATSAPP_NUMBER = "919833273838";

export function buildOrderWhatsAppUrl(orderId: string | undefined): string {
  const message = [
    "Hello,",
    "",
    "I would like an update regarding my order.",
    "",
    `Order ID: ${orderId || "—"}`,
  ].join("\n");
  return `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
