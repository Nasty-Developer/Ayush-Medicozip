---
name: Vercel workspace bundling
description: Deployment boundary rules for this pnpm workspace's Vercel API function.
---

The Vercel API function should import a prebuilt esbuild bundle created from the Express app's TypeScript entrypoint. Workspace package exports point at source TypeScript, so leaving those imports external can make Vercel resolve raw `.ts` files at runtime.

**Why:** The deployment environment places the catch-all function at the repository root while workspace dependencies are linked inside their owning package; bundling avoids both raw-source resolution and missing external dependency paths.

**How to apply:** Keep Replit/Render's artifact build separate from the root `api/build.mjs` Vercel build. Avoid explicit Express `IRouter` annotations in routes when Vercel's type pass resolves the interface without router methods; let `Router()` infer the type and explicitly type handler parameters when inference fails. Preserve the health endpoint path while changing types. Validate that the generated Vercel bundle contains no `@workspace/` imports, can be imported as an Express app, and that generated bundle output stays ignored.