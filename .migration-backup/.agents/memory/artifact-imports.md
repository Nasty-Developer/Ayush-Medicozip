---
name: Imported artifact registration
description: Re-registering runnable artifacts after importing an external Replit monorepo.
---

Imported Replit monorepos can contain valid artifact folders without those artifacts being registered in the current environment. Re-register the runnable app before relying on its preview workflow.

**Why:** Importing repository files can reset the current artifact registry even when `.replit-artifact/artifact.toml` files are present.

**How to apply:** After an import, check the registered artifacts and workflows, then register the app artifact and restore the repository files while preserving the generated artifact metadata.