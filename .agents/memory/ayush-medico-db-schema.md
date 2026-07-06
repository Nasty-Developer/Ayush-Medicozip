---
name: Ayush Medico PostgreSQL schema
description: Complete Drizzle schema for the pharmacy platform; key design decisions and known compat issues.
---

## Tables (lib/db/src/schema/)
- `users` — uuid PK, firebaseUid nullable unique, email unique; role: customer|admin
- `admin_users` — serial PK, firebaseUid not-null unique, email unique; role: admin|superadmin
- `categories` — serial PK, name+slug unique
- `products` — serial PK, FK→categories; stockStatus enum; showInNewArrivals, showInSpecialMedicines flags
- `inventory` — serial PK, productId unique FK→products (one row per product); quantity + reservedQuantity + reorderLevel
- `addresses` — serial PK, userId FK→users nullable (guest orders supported)
- `coupons` — serial PK, code unique uppercase; discountType: flat|percent; usageLimit+usedCount
- `orders` — serial PK, orderId text unique (AYM-YYYY-NNNNNN), firestoreId nullable unique (bridge to Firestore); status free-text
- `order_items` — serial PK, orderId FK→orders CASCADE

## Key decisions
- **No drizzle-zod**: `createInsertSchema` from drizzle-zod is incompatible with `zod ^3.25.76` (the ZodType private property shape changed). Use `$inferInsert` / `$inferSelect` instead.
- **firestoreId on orders**: nullable bridge column so Firestore-created orders can be linked to the PostgreSQL record without a full migration.
- **users.firebaseUid is nullable**: allows creating user rows before Firebase UID is known. The upsert route requires firebaseUid and falls back to email-based lookup to avoid duplicate rows.
- **Schema push**: `pnpm --filter @workspace/db run push` applies schema to the Replit-managed Postgres DB.

## Auth on API routes
- Public (no auth): GET /categories, GET /products, GET /products/:id, GET /categories/:id
- requireAuth only: POST /orders, GET /orders/:id, GET /orders/by-order-id/:orderId, GET/POST /users/*
- requireAuth + requireAdminEmail: all write endpoints for categories/products/inventory/coupons, GET /orders (list), PUT/PATCH /orders
