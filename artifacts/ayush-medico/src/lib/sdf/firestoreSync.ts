/**
 * Firestore Sync Engine
 *
 * Writes staged changes to the medicines / categories / brands collections.
 * Uses batched writes (≤ 400 ops per batch to stay under Firestore's 500 limit).
 *
 * Writes ONLY after the admin confirms the sync preview.
 */

import {
  collection,
  doc,
  writeBatch,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { SyncPreview, SyncProgress, StagedMedicine } from "./types";

const BATCH_SIZE = 400;

type ProgressCallback = (p: Partial<SyncProgress>) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Split an array into chunks of a given size */
function chunks<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ── Category sync ─────────────────────────────────────────────────────────────

async function syncCategories(
  preview: SyncPreview,
  onProgress: ProgressCallback
): Promise<Map<string, string>> {
  // Map normalised category name → Firestore doc ID
  const catIdMap = new Map<string, string>();

  const toCreate = preview.categories.items.filter((c) => c.action === "create");
  if (!toCreate.length) return catIdMap;

  onProgress({
    message: `Creating ${toCreate.length} new categories…`,
    processed: 0,
    total: toCreate.length,
  });

  const catCollection = collection(db!, "categories");

  for (const chunk of chunks(toCreate, BATCH_SIZE)) {
    const batch = writeBatch(db!);
    for (const cat of chunk) {
      const ref = doc(catCollection);
      batch.set(ref, {
        name: cat.name,
        icon: "💊",
        description: "",
        color: "primary",
        order: 99,
        enabled: true,
        slug: slugify(cat.name),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      catIdMap.set(cat.name.toLowerCase().trim(), ref.id);
    }
    await batch.commit();
  }

  return catIdMap;
}

// ── Brand sync ────────────────────────────────────────────────────────────────

async function syncBrands(
  preview: SyncPreview,
  onProgress: ProgressCallback
): Promise<void> {
  const toCreate = preview.brands.items.filter((b) => b.action === "create");
  if (!toCreate.length) return;

  onProgress({
    message: `Creating ${toCreate.length} new brands…`,
    processed: 0,
    total: toCreate.length,
  });

  const brandCollection = collection(db!, "brands");

  for (const chunk of chunks(toCreate, BATCH_SIZE)) {
    const batch = writeBatch(db!);
    for (const brand of chunk) {
      const ref = doc(brandCollection);
      batch.set(ref, {
        name: brand.name,
        logoUrl: "",
        description: "",
        website: "",
        order: 99,
        enabled: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    await batch.commit();
  }
}

// ── Medicine sync ─────────────────────────────────────────────────────────────

function buildMedicineDoc(m: StagedMedicine) {
  return {
    name: m.name,
    brand: m.brand,
    description: m.genericName || m.packInfo || "",
    imageUrl: "",
    stockStatus: m.stockStatus,
    available: m.available,
    sellingPrice: m.sellingPrice,
    mrp: m.mrp,
    discount: m.discount,
    categoryName: m.categoryName,
    order: 99,
    prescriptionRequired: m.prescriptionRequired,
    stockQty: m.stockQty,
    packInfo: m.packInfo,
    sdfProductId: m.sdfProductId,
    updatedAt: Timestamp.now(),
  };
}

async function syncMedicines(
  preview: SyncPreview,
  onProgress: ProgressCallback
): Promise<{ created: number; updated: number; failed: number }> {
  const toCreate = preview.medicines.items.filter((m) => m.action === "create");
  const toUpdate = preview.medicines.items.filter((m) => m.action === "update");

  let created = 0;
  let updated = 0;
  let failed = 0;

  const medCollection = collection(db!, "medicines");
  const total = toCreate.length + toUpdate.length;

  // Create
  for (const chunk of chunks(toCreate, BATCH_SIZE)) {
    try {
      const batch = writeBatch(db!);
      for (const m of chunk) {
        const ref = doc(medCollection);
        batch.set(ref, {
          ...buildMedicineDoc(m),
          createdAt: Timestamp.now(),
        });
      }
      await batch.commit();
      created += chunk.length;
      onProgress({
        message: `Creating medicines… (${created}/${toCreate.length})`,
        processed: created + updated,
        total,
      });
    } catch (err) {
      failed += chunk.length;
    }
  }

  // Update
  for (const chunk of chunks(toUpdate, BATCH_SIZE)) {
    try {
      const batch = writeBatch(db!);
      for (const m of chunk) {
        if (!m.existingDocId) continue;
        const ref = doc(db!, "medicines", m.existingDocId);
        batch.update(ref, buildMedicineDoc(m));
      }
      await batch.commit();
      updated += chunk.length;
      onProgress({
        message: `Updating medicines… (${updated}/${toUpdate.length})`,
        processed: created + updated,
        total,
      });
    } catch (err) {
      failed += chunk.length;
    }
  }

  return { created, updated, failed };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function executeSyncToFirestore(
  preview: SyncPreview,
  onProgress: ProgressCallback
): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
  if (!db) {
    return { created: 0, updated: 0, failed: 0, errors: ["Firebase not configured"] };
  }

  const errors: string[] = [];

  try {
    // 1. Categories first (medicines may need them to exist)
    await syncCategories(preview, onProgress);

    // 2. Brands
    await syncBrands(preview, onProgress);

    // 3. Medicines
    const result = await syncMedicines(preview, onProgress);

    return { ...result, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(msg);
    return { created: 0, updated: 0, failed: 0, errors };
  }
}
