/**
 * WhatsApp Notification Service
 *
 * Architecture: ready for WhatsApp Business Cloud API (Meta) integration.
 *
 * Configuration (environment variables):
 *   WHATSAPP_ACCESS_TOKEN    — Meta Graph API access token
 *   WHATSAPP_PHONE_NUMBER_ID — Sender phone number ID (from Meta Business Suite)
 *   WHATSAPP_API_VERSION     — API version, default "v19.0"
 *
 * When env vars are NOT set, all sends return { sent: false, reason: 'not_configured' }
 * and log the would-be message — so you can verify templates before going live.
 *
 * WhatsApp Business API docs:
 * https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

import { logger } from "./logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WhatsAppEvent =
  | "order_placed"
  | "payment_received"
  | "prescription_verified"
  | "prescription_rejected"
  | "order_preparing"
  | "order_packed"
  | "out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "order_refunded"
  | "request_clearer_prescription";

export type SendWhatsAppInput = {
  to: string;                    // Phone with country code, no + (e.g. "919833273838")
  event: WhatsAppEvent;
  params: Record<string, string>;
};

export type SendWhatsAppResult = {
  sent: boolean;
  reason?: string;
  messageId?: string;
};

// ─── Message templates ────────────────────────────────────────────────────────
// These are the text messages sent to customers.
// When WhatsApp Business API is live, you can migrate these to approved
// template messages for better delivery rates.

const TEMPLATES: Record<WhatsAppEvent, (p: Record<string, string>) => string> = {
  order_placed: (p) =>
    `🏥 *Ayush Medico*\n\nHi ${p.name || "there"}! Your order *#${p.orderId}* has been received ✅\n\n*Total: ₹${p.total || "—"}*\n\nOur pharmacist will review and confirm availability shortly. We'll keep you updated!\n\n_For help: +91 98332 73838_`,

  payment_received: (p) =>
    `✅ *Payment Verified — Ayush Medico*\n\nYour payment for order *#${p.orderId}* has been confirmed.\n\nWe're now preparing your medicines! 💊`,

  prescription_verified: (p) =>
    `✅ *Prescription Verified — Ayush Medico*\n\nGreat news! Your prescription for order *#${p.orderId}* has been verified by our pharmacist.\n\nYour order is now being processed.`,

  prescription_rejected: (p) =>
    `❌ *Prescription Issue — Ayush Medico*\n\nThere's an issue with the prescription for order *#${p.orderId}*.\n\n*Reason:* ${p.reason || "Could not be verified"}\n\nPlease send a clearer prescription or contact us at +91 98332 73838.`,

  request_clearer_prescription: (p) =>
    `📋 *Action Required — Ayush Medico*\n\nFor order *#${p.orderId}*, we need a clearer prescription image.\n\nPlease reply to this message with a better photo of your prescription.\n\nFor help: +91 98332 73838`,

  order_preparing: (p) =>
    `🔄 *Order Being Prepared — Ayush Medico*\n\nGreat news! Your order *#${p.orderId}* is being carefully prepared at our pharmacy. We'll notify you once it's packed!`,

  order_packed: (p) =>
    `📦 *Order Packed — Ayush Medico*\n\nYour order *#${p.orderId}* has been packed and is ready for dispatch. Our delivery partner will pick it up soon!`,

  out_for_delivery: (p) =>
    `🚴 *Out for Delivery — Ayush Medico*\n\nYour order *#${p.orderId}* is on its way!\n\n${p.partnerName ? `Delivery partner: ${p.partnerName} (${p.partnerPhone || "—"})` : "Our delivery partner is heading to your address."}\n\nPlease keep your phone handy.`,

  order_delivered: (p) =>
    `🎉 *Order Delivered — Ayush Medico*\n\nYour order *#${p.orderId}* has been successfully delivered!\n\nThank you for trusting Ayush Medico for your healthcare needs. 🙏\n\nGet well soon! 💚`,

  order_cancelled: (p) =>
    `❌ *Order Cancelled — Ayush Medico*\n\nYour order *#${p.orderId}* has been cancelled.\n\n${p.reason ? `Reason: ${p.reason}\n\n` : ""}For assistance or to place a new order, call us at +91 98332 73838.`,

  order_refunded: (p) =>
    `💰 *Refund Initiated — Ayush Medico*\n\nA refund has been initiated for your order *#${p.orderId}*.\n\nIt will reflect in your account within 3-5 business days.\n\nFor queries: +91 98332 73838`,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a phone number to E.164 digits only (no + or spaces). */
function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // Indian numbers: prepend 91 if 10 digits
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// ─── Sender ───────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp message via the Meta Business Cloud API.
 *
 * When access token / phone-number-id are not configured, returns
 * `{ sent: false, reason: 'not_configured' }` and logs the message body —
 * so you can confirm templates are correct before going live.
 */
export async function sendWhatsAppMessage(
  input: SendWhatsAppInput
): Promise<SendWhatsAppResult> {
  const accessToken     = process.env["WHATSAPP_ACCESS_TOKEN"];
  const phoneNumberId   = process.env["WHATSAPP_PHONE_NUMBER_ID"];
  const apiVersion      = process.env["WHATSAPP_API_VERSION"] ?? "v19.0";

  const template = TEMPLATES[input.event];
  if (!template) {
    logger.warn({ event: input.event }, "[WhatsApp] No template for event");
    return { sent: false, reason: "no_template" };
  }

  const messageText = template(input.params);
  const to = normalisePhone(input.to);

  // ── Dev/unconfigured mode: log and return ──────────────────────────────────
  if (!accessToken || !phoneNumberId) {
    logger.info(
      { event: input.event, to, orderId: input.params["orderId"] },
      `[WhatsApp] NOT_CONFIGURED — would send:\n${messageText}`
    );
    return { sent: false, reason: "not_configured" };
  }

  // ── Production: call Meta Graph API ────────────────────────────────────────
  const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: messageText,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      logger.error({ status: res.status, data, event: input.event, to }, "[WhatsApp] API error");
      return { sent: false, reason: `api_error_${res.status}` };
    }

    const messages = data["messages"] as Array<{ id: string }> | undefined;
    const messageId = messages?.[0]?.id;

    logger.info({ event: input.event, to, messageId }, "[WhatsApp] Message sent");
    return { sent: true, messageId };
  } catch (err) {
    logger.error({ err, event: input.event, to }, "[WhatsApp] Network error");
    return { sent: false, reason: "network_error" };
  }
}
