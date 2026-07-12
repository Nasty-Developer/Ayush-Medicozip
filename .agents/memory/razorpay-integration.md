---
name: Razorpay integration
description: TEST MODE Razorpay payment integration — architecture, API routes, frontend flow, and security model.
---

# Razorpay Integration — TEST MODE

## Credentials
- `VITE_RAZORPAY_KEY_ID` — env var (safe for browser, used in checkout modal)
- `RAZORPAY_KEY_SECRET` — Replit Secret (backend only, never sent to browser)

## Backend routes (`/api/payment`)
- `POST /api/payment/create-razorpay-order` — creates Razorpay order, stores `razorpayOrderId` in `orders.payment` JSONB; returns `{ razorpayOrderId, amount, currency, keyId }`
- `POST /api/payment/verify` — HMAC-SHA256 signature check; on success sets `payment.status = "paid"`, `order.status = "payment-verified"`
- `POST /api/payment/failure` — sets `payment.status = "failed"`, `order.status = "payment-pending"` (order saved, customer can retry)
- `POST /api/payment/send-request` — admin only; creates Razorpay Payment Link (24h TTL), returns `{ url, linkId }` for WhatsApp dispatch

## Frontend flow (checkout)
1. Customer selects Razorpay → clicks "Proceed to Pay"
2. Order created in DB with `status = "payment-pending"`, `payment.status = "pending"`
3. `POST /api/payment/create-razorpay-order` → get Razorpay order params
4. `loadRazorpayScript()` lazy-loads checkout.js from CDN
5. `new window.Razorpay({...}).open()` — modal opens
6. Success: `handler` calls `/api/payment/verify` → navigate to `/order-confirmation/:id`
7. Dismiss: `modal.ondismiss` calls `/api/payment/failure` → navigate to `/order/:id` (Pay Now button visible)

## Customer retry flow (`/order/:id`)
- `OrderDetailPage` shows "Pay Now" panel when `order.status === "payment-pending" && order.payment.method === "razorpay"`
- Same Razorpay flow as checkout (create → open → verify/failure)

## Admin panel
- Orders with `payment.method = "razorpay"` and `status = "payment-pending"` show a "Send Payment Request" button
- Creates a Razorpay Payment Link and opens WhatsApp with the link pre-filled
- `paymentLink` state stored in OrderCard so it can be copied again

## Status mapping
- Razorpay success: `payment.status = "paid"`, `order.status = "payment-verified"` (shown green in both admin and customer)
- Razorpay failure/dismiss: `payment.status = "failed"`, `order.status = "payment-pending"`
- UPI manual: `payment.status = "verified"` (admin verifies UTR)

## PaymentMethod order in UI
1. Card/Net Banking/UPI (Razorpay) — available=true, shown first
2. UPI Direct — available=true
3. COD — available=true
4. Wallet — available=false, "Coming soon"

**Why:** Razorpay is the preferred online payment; UPI direct is a manual fallback; COD has no upfront payment requirement.

## Switching to live mode
Change `VITE_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to live keys (`rzp_live_...`). No code changes needed.
