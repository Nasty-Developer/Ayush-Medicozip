---
name: Imported web app previews
description: Durable guidance for importing repositories that already contain Replit artifact manifests.
---

When importing a repository that already contains web artifact manifests, ensure only one registered web artifact owns the root preview path. Duplicate root paths can make the preview fail before the app is reached.

**Why:** Existing repository manifests can be auto-registered alongside a newly created preview artifact, producing ambiguous root routing.

**How to apply:** Preserve the imported source, but move any duplicate artifact to a non-root preview path or use the existing registered artifact as the main app.