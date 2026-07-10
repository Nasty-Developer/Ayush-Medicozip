---
name: Ayush Medico Request Medicine cross-page trigger
description: How triggering the Request Medicine form works from non-homepage routes
---

The `#request-medicine` section only renders inside `HomeSections` on the homepage (`App.tsx`). It does not exist on `/categories`, `/category/:slug`, or other routes.

`RequestMedicineContext.triggerRequest(name, brand, category)` therefore:
1. Sets prefill state (name/brand/category) and bumps a `requestToken` counter.
2. Calls wouter's `navigate("/")` unconditionally.
3. Retry-polls for the `#request-medicine` DOM node (up to ~20 attempts / 50ms) since the homepage may not have mounted yet, then scrolls to it.

**Why:** A plain `scrollIntoView` call fails silently when invoked from a page where the anchor doesn't exist yet (e.g. clicking "Request this Medicine" on a Categories card) — there's no synchronous way to know when the homepage section has mounted after `navigate()`.

**How to apply:** Any new UI that needs to open/prefill the Request Medicine form from outside the homepage should go through `useRequestMedicine().triggerRequest(...)`, not attempt to manage scrolling/prefill itself.
