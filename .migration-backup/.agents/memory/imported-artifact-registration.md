---
name: Imported artifact registration
description: Preserve generated artifact metadata when importing an existing app into a registered artifact directory.
---

When importing existing app files into a newly registered artifact, keep the generated `.replit-artifact/artifact.toml` intact; replacing or deleting it unregisters the preview and workflow.

**Why:** Artifact registration is managed separately from the repository source files, and the preview can disappear even when the application code is still present.

**How to apply:** Move an existing imported directory aside before registration, then copy its source files into the registered directory while excluding its repository metadata.