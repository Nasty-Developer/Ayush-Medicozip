---
name: Ayush Medico Render publishing
description: Deployment verification and repository publishing constraints for the combined Ayush Medico service.
---

The combined Render service must build the Ayush Medico Vite frontend and API, then serve the frontend from the API process while leaving `/api/*` routes untouched. Publishing to the external GitHub repository requires valid GitHub authentication; the workspace's internal Git remote synchronization is not proof that an external push succeeded.

**Why:** The production-style local server can pass every route check even when the external repository push is rejected by GitHub authentication.

**How to apply:** Always verify the compiled output path and combined server locally, then separately confirm external push success from the Git command result.