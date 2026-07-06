---
name: Ayush Medico order/status architecture
description: Where order-ID generation, status pipeline, and WhatsApp messaging live for the medicine-request flow, and why they reuse the "inquiries" collection.
---

Order IDs (`AYM-YYYY-NNNNNN`), the status pipeline/labels, and WhatsApp status-update message templates are centralized in `src/lib/orderId.ts`, `src/lib/orderStatus.ts`, and `src/lib/whatsappMessages.ts` respectively — both the admin dashboard and the customer-facing Track Order page import from these instead of keeping their own copies.

**Why:** There is no `firestore.rules` file in the repo (rules are managed in the Firebase Console, unverified/unmodifiable from here), so adding a new collection (e.g. a counters collection for sequential order numbers) would require rules changes we can't safely make. The existing "inquiries" collection is already publicly readable/queryable and admin-writable, so order-ID sequencing and lookups reuse it by querying/filtering on existing fields (`type`, `requestId`, `mobileNumber`) rather than introducing new collections.

**How to apply:** When adding features that need new persisted data for this app, first check whether it can be modeled as fields/queries on the existing "inquiries" collection before proposing a new collection — a new collection means unverified Firestore rules, which is out of bounds unless the user explicitly opens that up. Also keep status keys/labels/pipeline logic in `orderStatus.ts` as the single source of truth; don't let admin and customer surfaces drift into separate copies of the status enum.
