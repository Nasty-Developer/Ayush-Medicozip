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
