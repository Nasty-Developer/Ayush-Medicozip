---
name: Imported artifact routing
description: Handling imported repositories that already contain artifact metadata
---

When importing a repository into an existing artifact workspace, check for duplicate
web artifact registrations using the root preview path. Keep one storefront at `/`
and move any legacy duplicate to a distinct prefixed path through validated artifact
metadata replacement.

**Why:** Multiple registered services claiming `/` can make the shared preview proxy
fail before the app itself is even reached.

**How to apply:** After importing, list registered artifacts, inspect each
`.replit-artifact/artifact.toml`, and resolve duplicate preview paths before judging
the app's runtime behavior.

For Vercel deployments from the repository root, expect Vercel to run a broader
TypeScript pass than the local package check. Keep ESM-relative imports explicit
with `.js` and isolate framework/global type collisions at external API boundaries.

**Why:** Vercel's NodeNext-style checking can resolve CommonJS framework types
differently from the workspace's local TypeScript project.

**How to apply:** Validate the API package, the frontend package, and the production
bundle after each deployment-related fix.