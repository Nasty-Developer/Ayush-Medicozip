---
name: Local preview service-worker cache
description: A stale PWA worker can intercept local Vite module requests and create mixed React dependency versions.
---

The local browser Preview must clear any prior PWA service-worker registrations and caches before loading development modules.

**Why:** An old worker can serve cached application chunks while Vite serves current source, producing misleading runtime failures such as React invalid-hook errors even when the current build is valid.

**How to apply:** When a local Preview shows a dependency/runtime mismatch that disappears after hard reload, inspect service-worker registrations and cache cleanup before changing application dependencies.