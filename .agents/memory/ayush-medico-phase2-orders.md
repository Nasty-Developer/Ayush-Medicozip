---
name: Ayush Medico Phase 2 Order System
description: Architecture decisions and gotchas for the cart-based checkout order system (Phase 2), separate from the existing prescription-based inquiries flow.
---

## Firestore collections
- `orders/{docId}` — main order documents (items as array, not subcollection)
- `userAddresses/{uid}/addresses/{addressId}` — per-user saved addresses (subcollection)
- `payments/{paymentDocId}` — payment records (optional; order doc is source of truth)
- `deliveries/{orderId}` — delivery tracking (placeholder, ready for Porter)
- `notifications/{id}` — notification log (placeholder)

## Existing flow unchanged
The `inquiries` collection (prescription-based medicine requests) is NOT touched. `MedicineRequestsPage` and `RequestMedicine.tsx` continue to use it. The admin panel shows BOTH: "Orders" (new) and "Medicine Requests" (existing).

## COD vs UPI admin pipeline
COD orders skip `payment-pending` — admin accepts → `payment-verified` directly (payment at doorstep).
UPI orders: admin accepts → `payment-pending` → admin enters UTR → `payment-verified`.
Both then follow the same pipeline: `preparing → packed → ready-for-pickup → delivery-assigned → out-for-delivery → delivered`.

## verifyUpiPayment signature
`verifyUpiPayment(paymentDocId: string | null, orderDocId: string, upiTxnId: string)` — paymentDocId is nullable because the current architecture doesn't always create a separate payment document at checkout. Order doc is always updated; payment doc is updated only when an ID is provided.

## Cart
localStorage-based (`ayush_medico_cart_v1`). CartProvider wraps inside CustomerAuthProvider, outside RequestMedicineProvider in App.tsx. CartDrawer is rendered inside PublicLayout (not App root) so it doesn't appear on admin pages.

## Client-side ownership gate
OrderDetailPage checks `order.customerId === user.uid` after loading and blocks rendering if mismatched. This is NOT a replacement for Firestore security rules — rules must be set in Firebase Console by the store owner.

**Why:** Any signed-in customer could view another's order by guessing a Firestore doc ID if rules are open. Client check provides UX-level defense until rules are hardened.

## Routes added
- `/cart` — CartPage
- `/checkout` — CheckoutPage (3-step: address → payment → review)
- `/order-confirmation/:docId` — OrderConfirmationPage
- `/order/:docId` — OrderDetailPage

## Admin
- `/admin/orders` — OrdersPage (new, separate from MedicineRequestsPage)
- Nav item added to AdminLayout sidebar under "Customer" section
