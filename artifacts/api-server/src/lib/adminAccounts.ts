import { db } from "@workspace/db";
import { adminUsersTable, type AdminUser } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

/**
 * Admin account registry.
 *
 * Admin access used to be decided only by the VITE_ADMIN_EMAIL allowlist, which
 * is inlined into the browser bundle at build time. Adding a second staff
 * member therefore needed an env change plus a full rebuild, and a mismatch
 * between the build-time value and the server value produced "not authorised"
 * for people the owner had already approved.
 *
 * The `admin_users` table is now the single source of truth, with the env
 * allowlist kept only as a bootstrap/break-glass path so the owner can never
 * lock themselves out. The table is mirrored into a small in-memory set so the
 * many existing `isAdminEmail(...)` call sites stay synchronous.
 */

const CACHE_TTL_MS = 60_000;

let cachedEmails = new Set<string>();
let cacheLoadedAt = 0;

export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

export function envAdminEmails(): string[] {
  const raw = process.env["ADMIN_EMAIL"] ?? process.env["VITE_ADMIN_EMAIL"] ?? "";
  return raw
    .split(",")
    .map((entry) => normalizeEmail(entry))
    .filter(Boolean);
}

export function isEnvAdmin(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return envAdminEmails().includes(normalized);
}

export async function refreshAdminCache(options: { force?: boolean } = {}): Promise<void> {
  if (!options.force && Date.now() - cacheLoadedAt < CACHE_TTL_MS) return;
  try {
    const rows = await db
      .select({ email: adminUsersTable.email })
      .from(adminUsersTable)
      .where(eq(adminUsersTable.isActive, true));
    const next = new Set<string>();
    for (const row of rows) {
      const email = normalizeEmail(row.email);
      if (email) next.add(email);
    }
    cachedEmails = next;
    cacheLoadedAt = Date.now();
    logger.info({ admins: next.size }, "Admin account cache refreshed");
  } catch (err) {
    // Never widen access on a database hiccup: keep the previous snapshot so
    // the env allowlist stays the only guaranteed path.
    logger.warn({ err }, "Could not refresh admin account cache");
  }
}

export function isDatabaseAdmin(email: string | null | undefined): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return cachedEmails.has(normalized);
}

export async function resolveAdmin(
  email: string | null | undefined,
): Promise<{ isAdmin: boolean; source: "env" | "database" | null }> {
  if (isEnvAdmin(email)) return { isAdmin: true, source: "env" };
  if (isDatabaseAdmin(email)) return { isAdmin: true, source: "database" };
  // Another instance may have added this admin since our snapshot was taken.
  await refreshAdminCache({ force: true });
  if (isDatabaseAdmin(email)) return { isAdmin: true, source: "database" };
  return { isAdmin: false, source: null };
}

export async function listAdmins(): Promise<AdminUser[]> {
  return db.select().from(adminUsersTable).orderBy(adminUsersTable.createdAt);
}

export async function countActiveAdmins(): Promise<number> {
  const rows = await db
    .select({ email: adminUsersTable.email })
    .from(adminUsersTable)
    .where(eq(adminUsersTable.isActive, true));
  return rows.length;
}

export async function addAdmin(
  rawEmail: string,
  displayName: string | null = null,
): Promise<{ created: boolean; admin: AdminUser }> {
  const email = normalizeEmail(rawEmail);
  const [existing] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email))
    .limit(1);

  if (existing) {
    if (existing.isActive) return { created: false, admin: existing };
    const [reactivated] = await db
      .update(adminUsersTable)
      .set({ isActive: true, displayName: displayName ?? existing.displayName, updatedAt: new Date() })
      .where(eq(adminUsersTable.id, existing.id))
      .returning();
    await refreshAdminCache({ force: true });
    return { created: false, admin: reactivated ?? existing };
  }

  const [created] = await db
    .insert(adminUsersTable)
    .values({ email, displayName })
    .returning();
  await refreshAdminCache({ force: true });
  return { created: true, admin: created };
}

export async function deactivateAdmin(id: number): Promise<
  { ok: true; admin: AdminUser } | { ok: false; status: number; error: string }
> {
  const [existing] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.id, id))
    .limit(1);

  if (!existing) return { ok: false, status: 404, error: "Admin not found" };
  if (!existing.isActive) return { ok: true, admin: existing };

  if (isEnvAdmin(existing.email)) {
    return {
      ok: false,
      status: 409,
      error:
        "This admin comes from the ADMIN_EMAIL environment variable and cannot be removed here. Remove it from the environment instead.",
    };
  }

  const active = await countActiveAdmins();
  if (active <= 1) {
    return { ok: false, status: 409, error: "At least one admin must stay active" };
  }

  const [updated] = await db
    .update(adminUsersTable)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(adminUsersTable.id, id))
    .returning();

  await refreshAdminCache({ force: true });
  return { ok: true, admin: updated ?? existing };
}

/**
 * Records a successful admin sign-in. Env-allowlisted admins are mirrored into
 * the table on their first visit so the owner can see every active admin in one
 * place.
 */
export async function recordAdminLogin(
  firebaseUid: string,
  rawEmail: string,
  displayName: string | null = null,
): Promise<AdminUser | null> {
  const email = normalizeEmail(rawEmail);
  if (!email) return null;

  try {
    const [existing] = await db
      .select()
      .from(adminUsersTable)
      .where(eq(adminUsersTable.email, email))
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(adminUsersTable)
        .set({
          firebaseUid,
          lastLoginAt: new Date(),
          isActive: true,
          displayName: existing.displayName ?? displayName,
          updatedAt: new Date(),
        })
        .where(eq(adminUsersTable.id, existing.id))
        .returning();
      return updated ?? existing;
    }

    if (!isEnvAdmin(email)) return null;

    const [created] = await db
      .insert(adminUsersTable)
      .values({ firebaseUid, email, displayName, lastLoginAt: new Date() })
      .returning();
    await refreshAdminCache({ force: true });
    return created ?? null;
  } catch (err) {
    logger.warn({ err }, "Could not record admin login");
    return null;
  }
}
