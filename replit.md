# Ayush Medico

Ayush Medico & General Stores' pharmacy storefront for browsing medicines, requesting prescriptions, placing orders, and contacting the pharmacy.

## Run & Operate

- `pnpm --filter @workspace/ayush-medico run dev` — run the storefront
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — type-check all workspace packages
- `pnpm --filter @workspace/db run push` — apply schema changes to the development database only
- Keep Firebase and payment credentials in Replit Secrets; do not commit them.
- Storefront Firebase config uses `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`.
- Firebase Admin uses `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_CLIENT_EMAIL` plus `FIREBASE_PRIVATE_KEY`.
- Payments use `VITE_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`; `RAZORPAY_WEBHOOK_SECRET` is used for webhook verification.
- Admin access is restricted by `VITE_ADMIN_EMAIL` or `ADMIN_EMAIL`.

## Stack

- pnpm workspaces, Node.js, TypeScript
- Storefront: React, Vite, Wouter, TanStack Query
- API: Express 5, bundled with esbuild
- Data: PostgreSQL and Drizzle ORM
- Customer/admin identity and related services: Firebase

## Where things live

- `artifacts/ayush-medico` — storefront and customer/admin screens
- `artifacts/api-server` — API routes and Firebase Admin integration
- `lib/db/src/schema` — relational database schema
- `attached_assets` — imported media and supporting source assets

## Architecture decisions

- The storefront and API are separate managed services; API requests route through `/api`.
- The imported repository is from `https://github.com/Nasty-Developer/Ayush-Medicozip`.
- Keep the imported application behavior and existing provider choices intact when making future changes.

## Product

Customers can browse pharmacy products, submit medicine requests and prescriptions, manage a cart, and place orders. The app also includes admin and order-management screens.

## User preferences

- The user asked to import the existing Ayush-Medicozip GitHub repository.

## Gotchas

- The managed web and API workflows supply the required `PORT` and base-path configuration.
- Third-party actions such as Firebase authentication and Razorpay payments need the corresponding provider settings before those flows can work.
- Run a full workspace install after changing package manifests, then run the root typecheck to refresh shared package declarations.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
