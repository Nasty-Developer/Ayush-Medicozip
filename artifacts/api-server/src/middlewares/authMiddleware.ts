import type { Request } from "express";
import type { IncomingHttpHeaders } from "node:http";
import type { DecodedIdToken } from "firebase-admin/auth";
import {
  FirebaseAdminConfigurationError,
  getAuth,
} from "../lib/firebaseAdmin.js";
import { logger } from "../lib/logger.js";
import { isDatabaseAdmin, isEnvAdmin } from "../lib/adminAccounts.js";

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
  // Env allowlist is the bootstrap/break-glass path; the admin_users table is
  // the normal source of truth so the owner can add staff without a rebuild.
  return isEnvAdmin(email) || isDatabaseAdmin(email);
}

/**
 * requireAdminEmail — after requireAuth, checks the verified email against the
 * admin_users table and the VITE_ADMIN_EMAIL/ADMIN_EMAIL allowlist. Access
 * fails closed.
 */
export function requireAdminEmail(req: AuthenticatedRequest, res: any, next: any): void {
  if (!isAdminEmail(req.firebaseUser?.email)) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}
