/**
 * Vercel catch-all function for the bundled Express application.
 *
 * The build step emits app.mjs with workspace libraries already bundled.
 * Keeping this adapter separate prevents Vercel from resolving workspace
 * package exports back to their TypeScript source at runtime.
 */
import app from "./.vercel-build/app.mjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;