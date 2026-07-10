// Notification Service — Architecture for multi-channel customer notifications.
//
// Currently all dispatch methods are placeholders that log to Firestore's
// `notifications` collection only. No actual messages are sent.
//
// Future integration points:
//   WhatsApp: Twilio / Interakt / WATI API
//   SMS:      MSG91 / TextLocal / Twilio
//   Email:    SendGrid / Nodemailer via api-server
//   Push:     Firebase Cloud Messaging (FCM)

import {
  collection,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationEvent =
  | "order_placed"
  | "payment_received"
  | "prescription_verified"
  | "order_preparing"
  | "order_packed"
  | "out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "order_refunded";

export type NotificationChannel = "whatsapp" | "email" | "sms" | "push";

export type NotificationInput = {
  orderId: string;
  orderDocId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string | null;
  event: NotificationEvent;
  channels: NotificationChannel[];
  metadata?: Record<string, unknown>;
};

// ─── Event label map ──────────────────────────────────────────────────────────

const EVENT_LABELS: Record<NotificationEvent, string> = {
  order_placed: "Order Placed",
  payment_received: "Payment Received",
  prescription_verified: "Prescription Verified",
  order_preparing: "Order Being Prepared",
  order_packed: "Order Packed",
  out_for_delivery: "Out for Delivery",
  order_delivered: "Order Delivered",
  order_cancelled: "Order Cancelled",
  order_refunded: "Order Refunded",
};

// ─── Dispatch ─────────────────────────────────────────────────────────────────

/**
 * Queues a notification in Firestore and logs the intent.
 * Future: dispatches to actual channels via api-server webhooks.
 */
export async function queueNotification(input: NotificationInput): Promise<void> {
  console.info(
    `[NotificationService] Queuing ${input.event} for ${input.customerId} via ${input.channels.join(", ")}`
  );

  try {
    if (db) {
      await addDoc(collection(db, "notifications"), {
        orderId: input.orderId,
        orderDocId: input.orderDocId,
        customerId: input.customerId,
        event: input.event,
        eventLabel: EVENT_LABELS[input.event] ?? input.event,
        channels: input.channels,
        status: "queued",
        metadata: input.metadata ?? {},
        createdAt: Timestamp.now(),
      });
    }
  } catch (err) {
    console.error("[NotificationService] Failed to queue notification:", err);
  }

  // FUTURE WhatsApp:
  // await fetch("/api/notifications/whatsapp", {
  //   method: "POST",
  //   body: JSON.stringify({ phone: input.customerPhone, template: input.event, params: input.metadata }),
  //   headers: { "Content-Type": "application/json" },
  // });

  // FUTURE Email:
  // await fetch("/api/notifications/email", {
  //   method: "POST",
  //   body: JSON.stringify({ to: input.customerEmail, event: input.event, data: input.metadata }),
  //   headers: { "Content-Type": "application/json" },
  // });

  // FUTURE SMS:
  // await fetch("/api/notifications/sms", { ... });

  // FUTURE Push:
  // await sendFCMNotification(input.customerId, { title, body });
}
