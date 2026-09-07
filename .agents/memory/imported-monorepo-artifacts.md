---
name: Imported monorepo artifacts
description: Imported Replit monorepos may contain runnable artifact folders that are not registered in the destination project.
---

When importing a Replit monorepo with an existing artifact folder, preserve the source, register a clean artifact entry, then restore the source without overwriting generated artifact metadata. Refresh the workspace lockfile when imported package manifests add dependencies, rebuild shared composite declarations before leaf typechecks, and apply the imported database schema before judging API errors.

**Why:** The destination workspace can already have scaffold artifacts and stale generated declarations, while the imported repository can contain valid app code that is invisible to the artifact registry until explicitly registered.

**How to apply:** Use this sequence for future public-repository imports; preserve the imported app's generated metadata only where it matches the destination registration.