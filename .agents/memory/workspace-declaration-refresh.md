---
name: Workspace declaration refresh
description: A monorepo-specific TypeScript check can use stale shared-library declarations after schema changes.
---

When the API server reports that `@workspace/db` has no exported schema members even though the source barrel exports them, rebuild the referenced library declarations with the workspace TypeScript build before diagnosing every route as broken.

**Why:** The API project uses a TypeScript project reference to `lib/db`, while the package export points at source and the checked declaration output can lag behind schema edits.

**How to apply:** Refresh the referenced library with `tsc -b` and then rerun the API typecheck; do not treat the resulting broad missing-export list as application-level route failures until this is done.