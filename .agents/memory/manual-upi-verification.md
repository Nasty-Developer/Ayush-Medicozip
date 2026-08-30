---
name: Manual UPI verification
description: Security boundary for customer-submitted UPI references in the pharmacy order flow.
---

Customer-submitted UPI references are evidence for review, not proof of payment. They must remain in a verification-pending state until an authorized admin verifies the transaction and advances the order.

**Why:** A customer-controlled request must never be able to mark their own order as paid; doing so would bypass the pharmacy's payment verification step.

**How to apply:** Keep customer submission and admin verification on separate server-side paths. Treat provider-signed payment callbacks as a separate trusted path from manual UPI references.