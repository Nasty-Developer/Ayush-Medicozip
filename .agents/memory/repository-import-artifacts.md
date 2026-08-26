---
name: Repository import artifacts
description: Imported repositories may include artifact manifests that are not registered in the current Replit project.
---

When importing a repository that already contains `.replit-artifact/artifact.toml`, verify that the artifact is registered in the current project before trying to restart its workflow. If it is only present on disk, register the artifact first, then restore the repository source files without overwriting the generated artifact manifest.

**Why:** A copied manifest alone does not create a managed workflow, and attempting to restart it fails even though the source tree looks complete.

**How to apply:** After a repository import, check the registered artifact list and managed workflow names before starting services; preserve the current environment’s internal metadata while importing source files.

If a registered auxiliary artifact remains in the workspace, its manifest still contributes to the pnpm lockfile even when it is unrelated to the imported app.

**Why:** A frozen install can fail on an otherwise complete repository when the starter workspace's retained artifact has dependency ranges not represented in the imported lockfile.

**How to apply:** Preserve the auxiliary artifact and reconcile the workspace lockfile during installation instead of deleting the registered artifact.