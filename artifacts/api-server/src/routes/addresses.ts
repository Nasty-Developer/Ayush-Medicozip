/**
 * Addresses API — replaces Firestore "userAddresses/{uid}/addresses" subcollection.
 *
 * All routes are scoped to the authenticated Firebase user (via usersTable.firebaseUid).
 * A PostgreSQL `users` row is lazily created on first use so addresses can be
 * saved before any other part of the app has created the user record.
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { addressesTable, usersTable, type InsertAddress } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/authMiddleware";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const router = Router();

async function resolveUserId(req: AuthenticatedRequest): Promise<string> {
  const firebaseUid = req.firebaseUser!.uid;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid));
  if (existing) return existing.id;

  const email = req.firebaseUser!.email ?? `${firebaseUid}@unknown.ayushmedico.local`;
  const [created] = await db
    .insert(usersTable)
    .values({ firebaseUid, email, displayName: req.firebaseUser!.name ?? null })
    .onConflictDoNothing({ target: usersTable.firebaseUid })
    .returning();
  if (created) return created.id;

  const [row] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid));
  return row!.id;
}

async function sortedAddresses(userId: string) {
  const rows = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.userId, userId))
    .orderBy(asc(addressesTable.createdAt));
  return rows.sort((a: (typeof rows)[number], b: (typeof rows)[number]) =>
    a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1
  );
}

// ── GET /api/addresses ────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    res.json(await sortedAddresses(userId));
  } catch (err) {
    logger.error({ err }, "GET /addresses failed");
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
});

// ── POST /api/addresses ───────────────────────────────────────────────────────
router.post("/", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = await resolveUserId(req);
    const body = req.body as Omit<InsertAddress, "userId">;

    const created = await db.transaction(async (tx: Tx) => {
      if (body.isDefault) {
        await tx.update(addressesTable).set({ isDefault: false, updatedAt: new Date() }).where(eq(addressesTable.userId, userId));
      }
      const [row] = await tx.insert(addressesTable).values({ ...body, userId }).returning();
      return row!;
    });

    res.status(201).json({ id: created.id, addresses: await sortedAddresses(userId) });
  } catch (err) {
    logger.error({ err }, "POST /addresses failed");
    res.status(500).json({ error: "Failed to create address" });
  }
});

// ── PUT /api/addresses/:id ────────────────────────────────────────────────────
router.put("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const userId = await resolveUserId(req);
    const body = req.body as Partial<InsertAddress>;

    await db.transaction(async (tx: Tx) => {
      if (body.isDefault === true) {
        await tx.update(addressesTable).set({ isDefault: false, updatedAt: new Date() }).where(eq(addressesTable.userId, userId));
      }
      await tx
        .update(addressesTable)
        .set({ ...body, updatedAt: new Date() })
        .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
    });

    res.json(await sortedAddresses(userId));
  } catch (err) {
    logger.error({ err }, "PUT /addresses/:id failed");
    res.status(500).json({ error: "Failed to update address" });
  }
});

// ── PATCH /api/addresses/:id/default ──────────────────────────────────────────
router.patch("/:id/default", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const userId = await resolveUserId(req);

    await db.transaction(async (tx: Tx) => {
      await tx.update(addressesTable).set({ isDefault: false, updatedAt: new Date() }).where(eq(addressesTable.userId, userId));
      await tx
        .update(addressesTable)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
    });

    res.json(await sortedAddresses(userId));
  } catch (err) {
    logger.error({ err }, "PATCH /addresses/:id/default failed");
    res.status(500).json({ error: "Failed to set default address" });
  }
});

// ── DELETE /api/addresses/:id ─────────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const userId = await resolveUserId(req);
    await db.delete(addressesTable).where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /addresses/:id failed");
    res.status(500).json({ error: "Failed to delete address" });
  }
});

export default router;
