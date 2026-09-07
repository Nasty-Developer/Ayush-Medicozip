// Generates the customer-facing WhatsApp status-update message for a medicine
// order. The message is always built dynamically from the order's current
// Firestore data (never hardcoded), so it automatically reflects whatever
// status, price, or delivery info is on the document at the moment the admin
// clicks "Send Status Update on WhatsApp".

import type { RequestStatus } from "@/lib/orderStatus";
import { STATUS_LABELS } from "@/lib/orderStatus";

export type WhatsAppOrderInfo = {
  customerName: string;
  requestId?: string;
  medicineName: string;
  status: RequestStatus | string;
  grandTotal?: number | null;
  medicinePrice?: number | null;
  deliveryCharge?: number | null;
  fullAddress?: string;
};

const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] || fullName;

function amountFor(order: WhatsAppOrderInfo): number | null {
  if (order.grandTotal != null) return order.grandTotal;
  if (order.medicinePrice != null) {
    return order.medicinePrice + (order.deliveryCharge ?? 0);
  }
  return null;
}

/**
 * Builds the WhatsApp status-update message body for the given order,
 * tailored to its current status. Falls back to a generic status line for
 * any status without a bespoke template.
 */
export function buildStatusUpdateMessage(order: WhatsAppOrderInfo): string {
  const name = firstName(order.customerName);
  const orderId = order.requestId || "—";
  const statusLabel = STATUS_LABELS[order.status as RequestStatus] ?? order.status;
  const amount = amountFor(order);

  switch (order.status) {
    case "accepted":
      return [
        `Hello ${name},`,
        ``,
        `Your Ayush Medico order (${orderId}) has been verified successfully.`,
        ``,
        `Current Status: ✅ ${statusLabel}`,
        ``,
        `Your medicines are now being reserved.`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");

    case "medicine-reserved":
      return [
        `Hello ${name},`,
        ``,
        `Good news! Your medicines for order ${orderId} have been reserved.`,
        ``,
        `Current Status: ✅ ${statusLabel}`,
        ``,
        `We'll share the payment details shortly.`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");

    case "payment-pending":
      return [
        `Hello ${name},`,
        ``,
        `Your medicines are ready.`,
        ``,
        `Order ID: ${orderId}`,
        amount != null ? `Amount: ₹${amount}` : `Amount: To be confirmed`,
        ``,
        `Please complete the payment to continue with packing and delivery.`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");

    case "payment-received":
      return [
        `Hello ${name},`,
        ``,
        `We've received your payment for order ${orderId}. Thank you!`,
        ``,
        `Current Status: ✅ ${statusLabel}`,
        ``,
        `Your order will be packed shortly.`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");

    case "preparing":
      return [
        `Hello ${name},`,
        ``,
        `Your order (${orderId}) is now being packed.`,
        ``,
        `Current Status: ✅ ${statusLabel}`,
        ``,
        `We'll notify you once it's out for delivery.`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");

    case "out-for-delivery":
      return [
        `Hello ${name},`,
        ``,
        `Your medicines are now out for delivery.`,
        ``,
        `Order ID: ${orderId}`,
        `Estimated Delivery: 30–45 Minutes`,
        order.fullAddress ? `Delivering to: ${order.fullAddress}` : ``,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ]
        .filter((line) => line !== undefined)
        .join("\n");

    case "delivered":
      return [
        `Hello ${name},`,
        ``,
        `Your medicines have been successfully delivered.`,
        ``,
        `Thank you for choosing Ayush Medico.`,
        `We wish you good health.`,
      ].join("\n");

    case "medicine-unavailable":
      return [
        `Hello ${name},`,
        ``,
        `Unfortunately this medicine is currently unavailable.`,
        ``,
        `We are trying to arrange it.`,
        `We will contact you as soon as possible.`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");

    case "cancelled":
      return [
        `Hello ${name},`,
        ``,
        `Your medicine request (${orderId}) has been cancelled.`,
        ``,
        `If you believe this is incorrect, please contact Ayush Medico.`,
      ].join("\n");

    case "rejected":
      return [
        `Hello ${name},`,
        ``,
        `We're unable to proceed with your medicine request (${orderId}) at this time.`,
        ``,
        `Please contact Ayush Medico for more details.`,
      ].join("\n");

    case "pending-verification":
      return [
        `Hello ${name},`,
        ``,
        `Thank you for your order (${orderId}).`,
        ``,
        `Current Status: 🟡 ${statusLabel}`,
        ``,
        `Our pharmacist is reviewing your prescription and will update you shortly.`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");

    default:
      return [
        `Hello ${name},`,
        ``,
        `Here's an update on your Ayush Medico order (${orderId}).`,
        ``,
        `Current Status: ${statusLabel}`,
        ``,
        `Thank you,`,
        `Ayush Medico`,
      ].join("\n");
  }
}
