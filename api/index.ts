/**
 * Vercel Serverless Function Entry Point
 *
 * Wraps the Express app for deployment on Vercel.
 * Vercel's @vercel/node runtime accepts Express-compatible request handlers
 * as the default export.
 *
 * Routing (see root vercel.json):
 *   /api/* → this function
 *   /*      → artifacts/ayush-medico/dist/public (static frontend)
 */
import app from "../artifacts/api-server/src/app";

export default app;
