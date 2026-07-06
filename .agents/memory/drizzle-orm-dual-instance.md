---
name: Drizzle ORM dual-instance conflict
description: Adding firebase-admin to a package that shares @workspace/db causes pnpm to resolve two drizzle-orm instances with incompatible private types.
---

## Rule
When `firebase-admin` is added to any package in this workspace, pnpm creates two separate virtual instances of `drizzle-orm` (one with and one without `@opentelemetry/api` as a resolved optional peer). TypeScript then rejects cross-package Drizzle type usage with `Types have separate declarations of a private property 'shouldInlineParams'`.

**Why:** pnpm hashes package instances by their resolved optional peers. `firebase-admin` brings in `@opentelemetry/api`, which is an optional peer of `drizzle-orm`. Packages that don't have `firebase-admin` in scope get a different hash → different virtual instance → incompatible private types.

**How to apply:** Add the following to root `package.json` (already applied):
```json
{
  "pnpm": {
    "peerDependencyRules": {
      "ignoreMissing": ["@opentelemetry/api"]
    }
  }
}
```
Then run `pnpm install` to collapse the duplicate. This is safe because drizzle-orm's opentelemetry integration is optional and unused in this project.
