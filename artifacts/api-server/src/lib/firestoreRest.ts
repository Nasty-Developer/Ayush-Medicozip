/**
 * Firestore REST API Client
 *
 * Writes to Firestore using the REST API authenticated with the admin's
 * Firebase ID token — no service account required.
 *
 * The REST API endpoint:
 *   POST https://firestore.googleapis.com/v1/projects/{project}/databases/(default)/documents:commit
 *   Authorization: Bearer {firebase-id-token}
 *
 * Uses updateMask so only SDF-sourced fields are overwritten; manually-set
 * fields like imageUrl, showInNewArrivals, and featured are preserved.
 */

import type { ParsedMedicine } from "./sdf/parser";

// ── Firestore field value types ───────────────────────────────────────────────

type FsValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

type FsFields = Record<string, FsValue>;

function toFsVal(value: unknown): FsValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (Number.isInteger(value)) return { integerValue: String(value) };
    return { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  return { stringValue: String(value) };
}

function toFsFields(data: Record<string, unknown>): FsFields {
  const out: FsFields = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = toFsVal(v);
  }
  return out;
}

// ── Write helpers ─────────────────────────────────────────────────────────────

interface FsWrite {
  update: { name: string; fields: FsFields };
  updateMask?: { fieldPaths: string[] };
}

function docName(projectId: string, collection: string, docId: string): string {
  return `projects/${projectId}/databases/(default)/documents/${collection}/${docId}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Medicine writes ───────────────────────────────────────────────────────────

const MEDICINE_MASK_FIELDS = [
  "name", "brand", "description", "packInfo", "stockStatus", "available",
  "sellingPrice", "mrp", "discount", "categoryName", "order",
  "prescriptionRequired", "stockQty", "sdfProductId", "updatedAt",
];

export function buildMedicineWrites(
  medicines: ParsedMedicine[],
  projectId: string
): FsWrite[] {
  const now = new Date().toISOString();
  return medicines.map((m): FsWrite => ({
    update: {
      name: docName(projectId, "medicines", `sdf-${m.sdfProductId}`),
      fields: toFsFields({
        name: m.name,
        brand: m.brand,
        description: m.description,
        packInfo: m.packInfo,
        stockStatus: m.stockStatus,
        available: m.available,
        sellingPrice: m.sellingPrice,
        mrp: m.mrp,
        discount: m.discount,
        categoryName: m.categoryName,
        order: 99,
        prescriptionRequired: m.prescriptionRequired,
        stockQty: m.stockQty,
        sdfProductId: m.sdfProductId,
        updatedAt: now,
      }),
    },
    updateMask: { fieldPaths: MEDICINE_MASK_FIELDS },
  }));
}

// ── Category writes ───────────────────────────────────────────────────────────

export function buildCategoryWrite(name: string, projectId: string): FsWrite {
  return {
    update: {
      name: docName(projectId, "categories", `cat-${slugify(name)}`),
      fields: toFsFields({
        name,
        slug: slugify(name),
        icon: "💊",
        description: "",
        color: "primary",
        order: 99,
        enabled: true,
        updatedAt: new Date().toISOString(),
      }),
    },
    updateMask: { fieldPaths: ["name", "slug", "updatedAt"] },
  };
}

// ── Brand writes ──────────────────────────────────────────────────────────────

export function buildBrandWrite(name: string, projectId: string): FsWrite {
  return {
    update: {
      name: docName(projectId, "brands", `brand-${slugify(name)}`),
      fields: toFsFields({
        name,
        logoUrl: "",
        description: "",
        website: "",
        order: 99,
        enabled: true,
        updatedAt: new Date().toISOString(),
      }),
    },
    updateMask: { fieldPaths: ["name", "updatedAt"] },
  };
}

// ── Commit ────────────────────────────────────────────────────────────────────

export class QuotaExhaustedError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "QuotaExhaustedError";
  }
}

/** Commit up to 500 writes in one REST API call. */
export async function commitBatch(
  writes: FsWrite[],
  idToken: string,
  projectId: string
): Promise<void> {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });

  if (resp.ok) return;

  const body = await resp.text();
  const isQuota =
    resp.status === 429 ||
    resp.status === 503 ||
    /RESOURCE_EXHAUSTED/i.test(body);

  if (isQuota) {
    throw new QuotaExhaustedError(`Firestore quota exceeded: ${resp.status}`);
  }

  if (resp.status === 401 || resp.status === 403) {
    throw new Error(
      `Firestore auth error (${resp.status}). Your session may have expired — please reload and try again.`
    );
  }

  throw new Error(`Firestore commit failed (${resp.status}): ${body.slice(0, 300)}`);
}

// ── Checkpoint helpers ────────────────────────────────────────────────────────

export interface SyncCheckpoint {
  totalMedicines: number;
  lastCompletedBatch: number;  // index of last successfully written batch
  written: number;
  batchSize: number;
  startedAt: string;
  updatedAt: string;
}

const CHECKPOINT_COLLECTION = "_meta";
const CHECKPOINT_DOC_ID = "sync_checkpoint";

function firestoreBaseUrl(projectId: string): string {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

/** Persist checkpoint so a re-upload can skip already-written batches. */
export async function saveCheckpoint(
  data: SyncCheckpoint,
  idToken: string,
  projectId: string
): Promise<void> {
  const docPath = `${CHECKPOINT_COLLECTION}/${CHECKPOINT_DOC_ID}`;
  const url = `${firestoreBaseUrl(projectId)}/${docPath}?updateMask.fieldPaths=totalMedicines&updateMask.fieldPaths=lastCompletedBatch&updateMask.fieldPaths=written&updateMask.fieldPaths=batchSize&updateMask.fieldPaths=startedAt&updateMask.fieldPaths=updatedAt`;

  await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: toFsFields(data as unknown as Record<string, unknown>),
    }),
  });
  // Non-fatal: if checkpoint write fails, sync still continues
}

/** Read checkpoint — returns null if not found or unreadable. */
export async function loadCheckpoint(
  idToken: string,
  projectId: string
): Promise<SyncCheckpoint | null> {
  const docPath = `${CHECKPOINT_COLLECTION}/${CHECKPOINT_DOC_ID}`;
  const url = `${firestoreBaseUrl(projectId)}/${docPath}`;

  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    if (resp.status === 404) return null;
    if (!resp.ok) return null;

    const doc = (await resp.json()) as {
      fields?: Record<string, Record<string, unknown>>;
    };
    const f = doc.fields;
    if (!f) return null;

    function str(k: string): string {
      return String((f![k] as { stringValue?: unknown })?.stringValue ?? "");
    }
    function num(k: string): number {
      const v = f![k];
      if (!v) return 0;
      const iv = (v as { integerValue?: unknown }).integerValue;
      if (iv !== undefined) return Number(iv);
      const dv = (v as { doubleValue?: unknown }).doubleValue;
      if (dv !== undefined) return Number(dv);
      return 0;
    }

    return {
      totalMedicines: num("totalMedicines"),
      lastCompletedBatch: num("lastCompletedBatch"),
      written: num("written"),
      batchSize: num("batchSize"),
      startedAt: str("startedAt"),
      updatedAt: str("updatedAt"),
    };
  } catch {
    return null;
  }
}

/** Delete the checkpoint (called on successful completion). */
export async function clearCheckpoint(
  idToken: string,
  projectId: string
): Promise<void> {
  const docPath = `${CHECKPOINT_COLLECTION}/${CHECKPOINT_DOC_ID}`;
  const url = `${firestoreBaseUrl(projectId)}/${docPath}`;
  await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${idToken}` },
  }).catch(() => {/* non-fatal */});
}
