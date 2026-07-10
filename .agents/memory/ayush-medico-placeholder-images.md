---
name: Ayush Medico placeholder image system
description: How missing product photos are handled for MediVision-imported medicines
---

Medicines without a real photo (mostly the ~51k MediVision Gold imports) fall back to a single shared inline SVG data URI (`DEFAULT_MEDICINE_IMAGE` in `lib/medicineImage.ts`), not a static file.

**Why:** avoids 51k placeholder files/requests; a data URI ships inline in the JS bundle with zero extra network cost, and centralizes the fallback logic (`resolveMedicineImage()`) so every surface (cards, detail page, cart, carousels) renders consistently.

**How to apply:** any new UI that renders `medicine.imageUrl` must go through `resolveMedicineImage()`/`needsPlaceholderImage()` instead of hand-rolling its own emoji/letter-avatar fallback. On Firestore sync, only set `imageUrl: ""` (and default `showInNewArrivals`/`showInSpecialMedicines`/`featured` flags) on *document creation* — never on update, or a re-sync will wipe out admin-uploaded photos and curation toggles.
