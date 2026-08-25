/**
 * Vercel Catch-All API Function
 *
 * Handles ALL requests to /api/* for ALL HTTP methods (GET, POST, DELETE, etc.)
 * using Vercel's file-system catch-all routing ([...path] syntax).
 *
 * Why this file exists instead of relying on vercel.json rewrites:
 *   Vercel's rewrite rules (`/api/:path*` → `/api/index`) are processed at the
 *   edge layer and have inconsistent method-forwarding behaviour for non-GET
 *   requests in certain Vercel runtime versions — POST requests to new routes
 *   can fall through to the static-file catch-all and receive a 405.
 *
 *   File-system catch-all routes bypass the edge rewrite layer entirely.
 *   Vercel routes matching requests directly to this serverless function for
 *   every HTTP method, making POST /api/sync/session behave identically to
 *   GET /api/admin/stats.
 *
 * bodyParser is disabled so Vercel does not consume the request body before
 * Express/multer can read it. Required for:
 *   - POST /api/sync/chunk  — multipart file uploads (multer)
 *   - POST /api/payment/webhook — raw body for Razorpay HMAC verification
 * Express's own middleware in app.ts handles all body parsing.
 */
import app from "./.vercel-build/app.mjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
