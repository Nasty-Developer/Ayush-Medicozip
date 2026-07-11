---
name: Prescription & WhatsApp system
description: Architecture for prescription verification flow and WhatsApp manual buttons in admin orders.
---

## Prescription upload flow

- `PrescriptionUpload` component uploads to Firebase Storage at `prescriptions/{userId}/{orderId}/{timestamp}_{filename}`.
- `CheckoutPage` uses a stable `tempOrderId` (via `useState(() => ...)`) so the path stays constant across re-renders during the same checkout session.
- Prescription is mandatory (button disabled, not just warned) if any cart item has `prescriptionRequired: true`. The "Review Order" button shows "Upload Prescription to Continue" label when blocked.
- `prescription.url` is stored on the order doc; `prescription.verified` starts `false` and is flipped by admin.

## Admin prescription actions

- Approve: `updateOrderPrescription(docId, { verified: true })` + queue `prescription_verified` notification.
- Reject: `updateOrderPrescription(docId, { verified: false })` + `updateOrderFields(docId, { "prescription.rejectionReason": reason })`.
- Request clearer photo: opens `wa.me` pre-filled link (no API call needed).

## WhatsApp manual buttons architecture

- All buttons use `openWa(phone, message)` which opens a `https://wa.me/{normalised}?text={encoded}` URL.
- `normalisePhone()` converts a 10-digit Indian number to `91XXXXXXXXXX` for the wa.me format.
- `buildWaMessages(order)` returns a typed object of all message templates, derived from order data at call time.
- **To switch to WhatsApp Business API later**: replace only `openWa()` body with a `fetch("/api/notifications/whatsapp", ...)` call — button labels, triggers, and templates stay identical.
- Message templates: confirmation, paymentRequest, preparing, readyPickup, outForDelivery, delivered, cancellation, prescriptionVerified, prescriptionIssue.

## MyOrdersModal

- Now uses `subscribeToCustomerOrders` (Firestore onSnapshot) for real-time order status in the modal.
- Shows cart-based orders (new `orders` collection), NOT the old `inquiries` prescription requests.
- Includes an `OrderTimeline` component (5 key steps: Placed → Confirmed → Preparing → Out for Delivery → Delivered) with negative-status fallback (cancelled/returned/refunded).

## SDF missing medicines diagnostics

- `DiagnosticsPanel` added to `InventorySyncPage` — always visible, queries Firestore directly.
- Uses `getCountFromServer` per category to produce a breakdown table; highlights categories with 0 medicines.
- Root causes for 0-medicine categories: quota exhaustion mid-sync, or `categoryName` case mismatch between SDF and browse categories.
- `useMedicinesByCategory` PAGE_SIZE increased from 25 → 50; `useAllMedicines` from 24 → 48.
