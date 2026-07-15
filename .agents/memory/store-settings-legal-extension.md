---
name: Store settings legal extension
description: How legal/compliance fields were added to admin-editable public display without any backend or DB schema change.
---

Added fields drugLicenseNumber, gstNumber, shopEstablishmentReg, registeredPharmacist to the existing 'store' settings key (generic JSONB) in the admin SettingsPage.tsx type definition and defaults — zero backend/DB change needed.

**Why:** Task required no API modification but also admin-editable legal info. The settings table uses JSONB (no per-field schema) and GET /api/settings/store is already public, so new fields are transparently stored and fetched without touching the allowed-keys list or DB schema.

**How to apply:** Any new admin-editable public field follows this pattern — extend StoreSettings type in both SettingsPage.tsx AND src/hooks/useStoreSettings.ts (keep in sync), add to DEFAULTS, add a Field in the admin Section, read from useStoreSettings() in public components.

**useStoreSettings hook:** src/hooks/useStoreSettings.ts — public GET, cancel-on-unmount, used in Footer.tsx and TrustCompliance.tsx.
