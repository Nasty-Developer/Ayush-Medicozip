/**
 * Addresses API — replaces Firestore "userAddresses/{uid}/addresses" subcollection.
 *
 * All routes are scoped to the authenticated Firebase user (via usersTable.firebaseUid).
 * A PostgreSQL `users` row is lazily created on first use so addresses can be
 * saved before any other part of the app has created the user record.
 */

import { Router, type Response } from "express";
import { db } from "@workspace/db";
import { addressesTable, usersTable, type InsertAddress } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/authMiddleware.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const router = Router();

const requiredStringFields = [
  "fullName",
  "mobileNumber",
  "houseNumber",
  "street",
  "pincode",
] as const;

const optionalStringFields = [
  "alternateNumber",
  "buildingName",
  "area",
  "landmark",
  "city",
  "state",
] as const;

type AddressPayload = Omit<InsertAddress, "id" | "userId" | "createdAt" | "updatedAt">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseAddressBody(
  raw: unknown,
  options: { partial: boolean },
): { data?: Partial<AddressPayload>; error?: string } {
  if (!isRecord(raw)) return { error: "Address body must be a JSON object" };

  const data: Partial<AddressPayload> = {};
  for (const field of requiredStringFields) {
    const value = raw[field];
    if (value === undefined && options.partial) continue;
    if (typeof value !== "string" || !value.trim()) {
      return { error: `${field} is required` };
    }
    data[field] = value.trim();
  }

  for (const field of optionalStringFields) {
    const value = raw[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      return { error: `${field} must be a string` };
    }
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (field === "city" || field === "state") {
      if (!trimmed) return { error: `${field} cannot be empty` };
      data[field] = trimmed;
    } else {
      data[field] = trimmed || null;
    }
  }

  const mobileNumber = data.mobileNumber;
  if (mobileNumber && !/^[6-9]\d{9}$/.test(mobileNumber)) {
    return { error: "mobileNumber must be a valid 10-digit Indian mobile number" };
  }
  if (typeof data.alternateNumber === "string" && data.alternateNumber && !/^[6-9]\d{9}$/.test(data.alternateNumber)) {
    return { error: "alternateNumber must be a valid 10-digit Indian mobile number" };
  }
  if (data.pincode && !/^\d{6}$/.test(data.pincode)) {
    return { error: "pincode must be a valid 6-digit number" };
  }

  if (raw.addressType !== undefined) {
    if (raw.addressType !== "home" && raw.addressType !== "work" && raw.addressType !== "other") {
      return { error: "addressType must be home, work, or other" };
    }
    data.addressType = raw.addressType;
  }

  if (raw.isDefault !== undefined) {
    if (typeof raw.isDefault !== "boolean") return { error: "isDefault must be a boolean" };
    data.isDefault = raw.isDefault;
  }

  for (const field of ["lat", "lng"] as const) {
    if (raw[field] === undefined || raw[field] === null || raw[field] === "") continue;
    const value = typeof raw[field] === "number" ? raw[field] : Number(raw[field]);
    if (!Number.isFinite(value)) return { error: `${field} must be a valid number` };
    data[field] = String(value) as AddressPayload[typeof field];
  }

  return { data };
}

async function resolveUserId(req: AuthenticatedRequest): Promise<string> {
  const firebaseUid = req.firebaseUser!.uid;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid));
  if (existing) return existing.id;

  const email = req.firebaseUser!.email;
  if (!email) throw new Error("AUTH_EMAIL_REQUIRED");

  const [emailMatch] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (emailMatch) {
    if (emailMatch.firebaseUid && emailMatch.firebaseUid !== firebaseUid) {
      throw new Error("USER_EMAIL_CONFLICT");
    }
    const [linked] = await db
      .update(usersTable)
      .set({
        firebaseUid,
        displayName: req.firebaseUser!.name ?? emailMatch.displayName,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, emailMatch.id))
      .returning();
    if (linked) return linked.id;
  }

  const [created] = await db
    .insert(usersTable)
    .values({ firebaseUid, email, displayName: req.firebaseUser!.name ?? null })
    .onConflictDoNothing({ target: usersTable.firebaseUid })
    .returning();
  if (created) return created.id;

  const [row] = await db.select().from(usersTable).where(eq(usersTable.firebaseUid, firebaseUid));
  if (!row) throw new Error("USER_RESOLUTION_FAILED");
  return row.id;
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
    const parsed = parseAddressBody(req.body, { partial: false });
    if (!parsed.data) {
      res.status(400).json({ error: parsed.error ?? "Invalid address" });
      return;
    }
    const userId = await resolveUserId(req);
    const body = parsed.data as AddressPayload;

    const created = await db.transaction(async (tx: Tx) => {
      if (body.isDefault) {
        await tx.update(addressesTable).set({ isDefault: false, updatedAt: new Date() }).where(eq(addressesTable.userId, userId));
      }
      const [row] = await tx.insert(addressesTable).values({ ...body, userId }).returning();
      return row!;
    });

    res.status(201).json({ id: created.id, addresses: await sortedAddresses(userId) });
  } catch (err) {
    if (err instanceof Error && err.message === "AUTH_EMAIL_REQUIRED") {
      res.status(400).json({ error: "Verified token email is required" });
      return;
    }
    if (err instanceof Error && err.message === "USER_EMAIL_CONFLICT") {
      res.status(409).json({ error: "This email is already linked to another account" });
      return;
    }
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
    const parsed = parseAddressBody(req.body, { partial: true });
    if (!parsed.data || Object.keys(parsed.data).length === 0) {
      res.status(400).json({ error: parsed.error ?? "No valid address fields supplied" });
      return;
    }
    const body = parsed.data;

    await db.transaction(async (tx: Tx) => {
      const [owned] = await tx.select({ id: addressesTable.id }).from(addressesTable)
        .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
      if (!owned) throw new Error("ADDRESS_NOT_FOUND");
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
    if (err instanceof Error && err.message === "ADDRESS_NOT_FOUND") { res.status(404).json({ error: "Address not found" }); return; }
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
      const [owned] = await tx.select({ id: addressesTable.id }).from(addressesTable)
        .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
      if (!owned) throw new Error("ADDRESS_NOT_FOUND");
      await tx.update(addressesTable).set({ isDefault: false, updatedAt: new Date() }).where(eq(addressesTable.userId, userId));
      await tx
        .update(addressesTable)
        .set({ isDefault: true, updatedAt: new Date() })
        .where(and(eq(addressesTable.id, id), eq(addressesTable.userId, userId)));
    });

    res.json(await sortedAddresses(userId));
  } catch (err) {
    if (err instanceof Error && err.message === "ADDRESS_NOT_FOUND") { res.status(404).json({ error: "Address not found" }); return; }
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
    res.json({ success: true, addresses: await sortedAddresses(userId) });
  } catch (err) {
    logger.error({ err }, "DELETE /addresses/:id failed");
    res.status(500).json({ error: "Failed to delete address" });
  }
});

export default router;
