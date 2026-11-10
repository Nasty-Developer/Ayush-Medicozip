/**
 * Admin account routes — who is allowed into the admin panel.
 *
 *   GET    /api/admin/accounts/me   → { email, isAdmin, source }   (any signed-in user)
 *   GET    /api/admin/accounts      → active + inactive admin list (admin only)
 *   POST   /api/admin/accounts      → add an admin by email        (admin only)
 *   DELETE /api/admin/accounts/:id  → deactivate an admin          (admin only)
 *
 * The browser calls /me instead of comparing against a build-time email so
 * adding a staff member never needs a rebuild or an env change.
 */

import { Router, type Response } from "express";
import {
  requireAuth,
  requireAdminEmail,
  type AuthenticatedRequest,
} from "../middlewares/authMiddleware.js";
import {
  addAdmin,
  deactivateAdmin,
  isEnvAdmin,
  listAdmins,
  recordAdminLogin,
  resolveAdmin,
} from "../lib/adminAccounts.js";
import { logger } from "../lib/logger.js";

const router = Router();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.get("/me", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const user = req.firebaseUser;
  const email = user?.email ?? null;

  try {
    const { isAdmin, source } = await resolveAdmin(email);

    // Mirror env-allowlisted admins into the table and stamp their last login.
    if (isAdmin && user?.uid && email) {
      const displayName = typeof user.name === "string" ? user.name : null;
      void recordAdminLogin(user.uid, email, displayName);
    }

    res.json({ email, isAdmin, source });
  } catch (err) {
    logger.error({ err }, "GET /admin/accounts/me failed");
    // Fail closed but keep the response shape the UI expects.
    res.json({ email, isAdmin: isEnvAdmin(email), source: isEnvAdmin(email) ? "env" : null });
  }
});

router.get("/", requireAuth, requireAdminEmail, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const admins = await listAdmins();
    res.json({
      data: admins.map((admin) => ({
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
        managedByEnv: isEnvAdmin(admin.email),
      })),
    });
  } catch (err) {
    logger.error({ err }, "GET /admin/accounts failed");
    res.status(500).json({ error: "Failed to load admins" });
  }
});

router.post("/", requireAuth, requireAdminEmail, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as { email?: unknown; displayName?: unknown };
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const displayName = typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim()
      : null;

    if (!EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: "Enter a valid email address" });
      return;
    }

    const { created, admin } = await addAdmin(email, displayName);
    res.status(created ? 201 : 200).json({
      created,
      admin: {
        id: admin.id,
        email: admin.email,
        displayName: admin.displayName,
        role: admin.role,
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt,
        createdAt: admin.createdAt,
        managedByEnv: isEnvAdmin(admin.email),
      },
    });
  } catch (err) {
    logger.error({ err }, "POST /admin/accounts failed");
    res.status(500).json({ error: "Failed to add admin" });
  }
});

router.delete("/:id", requireAuth, requireAdminEmail, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const result = await deactivateAdmin(id);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json({ id: result.admin.id, isActive: result.admin.isActive });
  } catch (err) {
    logger.error({ err }, "DELETE /admin/accounts/:id failed");
    res.status(500).json({ error: "Failed to remove admin" });
  }
});

export default router;
