---
name: Ayush Medico delivery zone
description: How delivery eligibility is determined for the Ayush Medico medicine-delivery request system, and why.
---

The medicine delivery request spec calls for validating that a customer's address is within ~4km of the Kurla West pharmacy. No geocoding/maps API is configured for this project, so eligibility is determined by a hardcoded pincode allowlist (see `src/lib/deliveryZone.ts`) rather than true radius/distance math.

**Why:** No Google Maps/geocoding API key or integration was available or requested, and the spec didn't mandate a specific provider. A pincode allowlist is a reasonable proxy for a small, well-known delivery radius around one physical store.

**How to apply:** If a real geocoding integration is added later, replace the allowlist check in `deliveryZone.ts` with actual distance calculation, but keep the same function signature so callers (RequestMedicine form, admin panel) don't need to change.
