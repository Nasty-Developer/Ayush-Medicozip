---
name: Production audit — security & backend improvements
description: What was added during the production-readiness audit pass (security, webhooks, Porter, refunds, lazy loading).
---

## Security middleware (app.ts)
- `helmet` added with `crossOriginResourcePolicy: cross-origin` and CSP disabled (handled by Vite).
- `express-rate-limit` added: general 300/15min; payment 30/15min; sync 20/hr.
- Razorpay webhook needs `express.raw()` before `express.json()` — app.ts mounts the raw handler on `/api/payment/webhook` path specifically, then json() for everything else.

**Why:** Previously app had no rate limiting or security headers — any DoS, brute-force, or clickjacking was wide open.

## Razorpay webhook (payment.ts)
- `POST /api/payment/webhook` — verifies `x-razorpay-signature` with HMAC-SHA256 when `RAZORPAY_WEBHOOK_SECRET` env var is set.
- Updates order to `payment-verified` on `payment.captured` event, `payment-pending` on `payment.failed`.
- Always returns 200 to Razorpay (even on processing error) to prevent retry floods.

## Razorpay refund (payment.ts)
- `POST /api/payment/refund` — admin only; calls `rzp.payments.refund()` when order has `razorpayPaymentId`, else falls back to mark-refunded without API call (COD/UPI orders).

## Porter delivery (routes/porter.ts)
- Full route set: `/api/porter/estimate`, `/api/porter/book`, `/api/porter/track/:id`, `/api/porter/cancel`, `/api/porter/webhook`.
- Gracefully returns `{ configured: false }` with a 503 when `PORTER_API_KEY` env var is not set.
- Uses UAT base URL by default (`pfe-apigw-uat.porter.in`); change to `api.porter.in` for prod.
- Porter webhook updates order status via a linear scan of all orders matching `delivery.porterOrderId` (no indexed lookup yet).
- Pickup address configurable via `PORTER_PICKUP_*` env vars; falls back to hardcoded Hill Road / Bandra coords.

## Frontend improvements
- App.tsx: all page-level components are now `React.lazy()` + `Suspense`. Hero, TrustBadges, Categories load eagerly (above fold); everything else lazy.
- `ErrorBoundary` class component in `components/ErrorBoundary.tsx` — wraps the entire app + individual pages. Shows "Try Again" + "Go Home" on crash, dev-mode error details.
- 404 page (`pages/not-found.tsx`) fully replaced with user-friendly design + call-to-action.
- CartPage coupon now calls `POST /api/coupons/validate` with `{ code, orderAmount }` — no more hardcoded DEMO_COUPONS dict.
- Admin OrdersPage: "Book Porter Delivery" button (primary) + manual assignment fallback; refund button calls real `/api/payment/refund` endpoint.
- `deliveryService.ts` fully rewritten to proxy through backend routes instead of returning stubs.

## Still open from audit (not yet implemented)
- Mobile overflow audit (320-414px) — needs real browser testing.
- Loading skeletons on category/medicine pages.
- Per-page SEO `<title>` and `<meta>` tags.
- Legal pages still have placeholder text.
- `VITE_ADMIN_EMAIL` enforcement — currently permissive if unset.
