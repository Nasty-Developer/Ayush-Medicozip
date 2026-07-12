---
name: Ayush Medico PostgreSQL Medicine Catalogue Migration
description: Full migration of medicine catalogue from Firestore to PostgreSQL — schema, API routes, frontend hooks, admin panel
---

## What was migrated

The medicine catalogue (13k+ medicines from MediVision Gold SDF files) moved from Firestore `medicines` collection to PostgreSQL.

## New PostgreSQL tables
- `medicines` — main catalogue (unique key: `product_code` = sdfProductId, for idempotent upserts)
- `companies` — manufacturer names (unique: `name`)
- `drug_groups` — generic drug names (unique: `name`, derived from genericName/description field)
- `stock` — aggregated stock per medicine (one row per medicine from STOCK.SDF)
- `categories` — EXTENDED with `icon`, `color`, `enabled` columns (were not there before)

## Firebase remains for
Authentication, Users, Orders, Medicine Requests, Wishlist, Testimonials, Announcements, Notifications, Settings (homepage section enabled/title/description)

## API routes (all at /api/*)
- Medicines router mounted at root ("/") to support `/api/medicines`, `/api/categories`, `/api/category/:slug`, `/api/search`, etc.
- Admin categories CRUD at `/api/admin/categories` (uses existing `categoriesRouter`)
- Sync route at `/api/sync/upload` now writes to PostgreSQL (not Firestore)

## Key design decisions

**Why:** Medicine IDs are now numeric integers (PostgreSQL serial). The frontend `CategoryMedicine.id` is typed as `string` — the API returns `String(m.id)`. Links like `/medicine/123` use the numeric PG id.

**Why:** `featured`, `newArrival`, `special`, and `imageUrl` on medicines are EXCLUDED from the ON CONFLICT UPDATE clause. These are admin-managed flags that must survive re-imports. Everything else is always updated from the SDF.

**Why:** Categories use `name` as the unique key for upsert. `slug` is derived from `name` via slugify(). If the admin edits icon/color/enabled in the admin panel, re-importing does NOT overwrite those (uses `onConflictDoNothing` for categories so only new categories from SDF are inserted).

**Why:** `drug_groups` table is populated from distinct `genericName` values in the medicines, NOT from DRUG.SDF (the SDF format for drug groups is undocumented/complex; this approach gives clean drug group data).

**Why:** Admin `CategoriesPage.tsx` was migrated from Firestore CRUD to API CRUD (`/api/admin/categories`). All Firestore helpers (`addDocument`, `updateDocument`, `deleteDocument`) were removed from it.

## Frontend hooks after migration
- `useCategories` → reads from `/api/categories` (PostgreSQL, enabled only, with counts)
- `useAllMedicines` → reads from `/api/medicines` (paginated)
- `useMedicinesByCategory` → reads from `/api/medicines?category=:name`
- `useMedicineCounts` → derived from `useCategories` count field
- `NewArrivals` → fetches from `/api/medicines/new-arrivals`
- `SpecialMedicines` → fetches from `/api/medicines/special`
- `MedicineDetailPage` → fetches from `/api/medicines/:id`

## PostgreSQL import performance
~13k medicines: expected ~10–30 seconds, no quota limits, no delays. Uses batch upserts of 500 medicines per batch with `ON CONFLICT (product_code) DO UPDATE`.

## Admin dashboard category count
`DashboardPage.tsx` now reads medicine count by summing `categories[].count` from the API, and categories count from `categories.length`. Firestore no longer queried for these two stats.

## Category image system (implemented)
- 21 AI-generated PNGs in `artifacts/ayush-medico/public/category-images/` (10 original + 11 new)
- `categories.image_url` in PostgreSQL stores the active image for each category
- `resolveMedicineImage(imageUrl, categoryImageUrl, categoryName)` — 3-arg priority chain: medicine-level → category DB image → keyword PNG → SVG emoji fallback
- `CategoryMedicine.categoryImageUrl` — API joins categories table and returns imageUrl alongside each medicine
- `CategoryDetailPage` shows a full-width photo banner when `category.imageUrl` is set; falls back to gradient+icon when not
- Admin `CategoriesPage` has per-row image thumbnail + upload button (Cloudinary, same preset as medicine images)
- `categoryNormalizer.ts` in api-server maps raw SDF clinical names (ANALGESICS, ANTI-INFECTIVES, etc.) + company/product name patterns to 21 consumer-friendly categories on every import
- All 15 existing DB categories seeded with their `imageUrl` via direct SQL UPDATE

## How to apply
Run SDF import via admin panel → Inventory Sync. Upload PRODUCT.SDF + STOCK.SDF, optionally COMPANY.SDF + CATEGORY.SDF + DRUG.SDF. Everything imports to PostgreSQL.
