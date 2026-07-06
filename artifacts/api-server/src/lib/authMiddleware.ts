import type { Request, Response, NextFunction } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAuth } from "./firebaseAdmin";
import { logger } from "./logger";

export interface AuthenticatedRequest extends Request {
  firebaseUser?: DecodedIdToken;
}

/**
 * requireAuth — verifies Firebase ID token in Authorization: Bearer <token> header.
 * Rejects 401 if missing/invalid.
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
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
    logger.warn({ err }, "Firebase token verification failed");
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * requireAdminEmail — after requireAuth, checks the verified email against
 * the VITE_ADMIN_EMAIL allowlist (comma-separated). If the env var is not set,
 * any authenticated user is accepted (set the var in production).
 */
export function requireAdminEmail(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const allowlist = process.env["VITE_ADMIN_EMAIL"];
  if (!allowlist) {
    logger.warn("VITE_ADMIN_EMAIL not set; any authenticated user can access admin routes");
    next();
    return;
  }

  const email = req.firebaseUser?.email ?? "";
  const allowed = allowlist.split(",").map((e) => e.trim().toLowerCase());
  if (!email || !allowed.includes(email.toLowerCase())) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
}
