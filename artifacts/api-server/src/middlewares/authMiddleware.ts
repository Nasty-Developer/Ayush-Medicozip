import type { Request } from "express";
import type { IncomingHttpHeaders } from "node:http";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  FirebaseAdminConfigurationError,
  getAuth,
} from "../lib/firebaseAdmin.js";
import { logger } from "../lib/logger.js";

export interface AuthenticatedRequest extends Request {
  firebaseUser?: DecodedIdToken;
  headers: IncomingHttpHeaders;
}

/**
 * requireAuth — verifies Firebase ID token in Authorization: Bearer <token> header.
 * Rejects 401 if missing/invalid.
 */
export async function requireAuth(req: AuthenticatedRequest, res: any, next: any): Promise<void> {
  const authHeader =
    typeof req.headers.authorization === "string"
      ? req.headers.authorization
      : undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or malformed Authorization header" });
    return;
  }

  const idToken = authHeader.slice(7);
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    req.firebaseUser = decoded;
    next();
  } catch (err) {
    if (err instanceof FirebaseAdminConfigurationError) {
      logger.error({ err }, "Firebase Admin is not configured for token verification");
      res.status(503).json({
        error: "Authentication service is not configured",
        code: err.code,
      });
      return;
    }
    logger.warn({ err }, "Firebase token verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * isAdminEmail — shared predicate used both by the requireAdminEmail
 * middleware and by routes that need to branch behavior (e.g. "customers can
 * see their own orders, admins can see all") without rejecting the request
 * outright. Mirrors the same admin allowlist logic used by the browser.
 */
export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const allowlist = process.env["VITE_ADMIN_EMAIL"] ?? process.env["ADMIN_EMAIL"] ?? "";
  const allowed = allowlist
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/**
 * requireAdminEmail — after requireAuth, checks the verified email against
 * the VITE_ADMIN_EMAIL/ADMIN_EMAIL allowlist (comma-separated). Admin access
 * fails closed when no allowlist is configured.
 */
export function requireAdminEmail(req: AuthenticatedRequest, res: any, next: any): void {
  const allowlist = process.env["VITE_ADMIN_EMAIL"] ?? process.env["ADMIN_EMAIL"] ?? "";
  if (!allowlist.trim()) {
    logger.error("Admin email allowlist is not configured; refusing admin access");
    res.status(503).json({
      error: "Admin access is not configured",
      code: "admin_not_configured",
    });
    return;
  }
  if (!isAdminEmail(req.firebaseUser?.email)) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}
