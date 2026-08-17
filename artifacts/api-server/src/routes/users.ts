import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, adminUsersTable, type InsertUser, type InsertAdminUser } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

// Must be registered before /:id to prevent the dynamic segment from capturing it
router.get("/by-firebase/:uid", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, String(req.params["uid"] ?? "")));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (err) {
    logger.error({ err }, "Failed to fetch user");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Auth-protected: only the authenticated user (or admin) can access
router.get("/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, String(req.params["id"] ?? "")));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(user);
  } catch (err) {
    logger.error({ err }, "Failed to fetch user");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Upsert after Firebase sign-in — requires auth + firebaseUid
router.post("/", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as InsertUser;
    if (!data.email || !data.firebaseUid) {
      res.status(400).json({ error: "email and firebaseUid are required" });
      return;
    }

    // Check for email conflict before upserting on firebaseUid
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.firebaseUid, data.firebaseUid), eq(usersTable.email, data.email)));

    let upserted;
    if (existing) {
      const [updated] = await db
        .update(usersTable)
        .set({ displayName: data.displayName, phone: data.phone, updatedAt: new Date() })
        .where(eq(usersTable.id, existing.id))
        .returning();
      upserted = updated;
    } else {
      const [created] = await db.insert(usersTable).values(data).returning();
      upserted = created;
    }

    res.status(201).json(upserted);
  } catch (err) {
    logger.error({ err }, "Failed to upsert user");
    res.status(500).json({ error: "Failed to upsert user" });
  }
});

// Admin: sync admin user record after login
router.post("/admin/sync", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as InsertAdminUser;
    if (!data.firebaseUid || !data.email) {
      res.status(400).json({ error: "firebaseUid and email are required" });
      return;
    }
    const [upserted] = await db
      .insert(adminUsersTable)
      .values(data)
      .onConflictDoUpdate({
        target: adminUsersTable.firebaseUid,
        set: { displayName: data.displayName, lastLoginAt: new Date(), updatedAt: new Date() },
      })
      .returning();
    res.status(201).json(upserted);
  } catch (err) {
    logger.error({ err }, "Failed to sync admin user");
    res.status(500).json({ error: "Failed to sync admin user" });
  }
});

export default router;
