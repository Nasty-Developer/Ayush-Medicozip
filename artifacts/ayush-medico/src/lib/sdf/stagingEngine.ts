/**
 * Staging Engine
 *
 * Compares parsed SDF data with existing Firestore data to produce a
 * SyncPreview describing what will be created, updated, or skipped.
 * Nothing is written to Firestore here.
 *
 * Performance fix: the old code called getCollection("medicines") which
 * fetched ALL 51k+ medicine documents in a single request — this alone
 * was causing the resource-exhausted quota error before any write started.
 *
 * Now uses cursor-based pagination (500 docs/page, 150ms delay between
 * pages) so the read is broken into many small requests that are resilient
 * to timeouts and quota limits. Progress is reported so the UI can show
 * "Loading existing medicines… (12,500 loaded)" instead of appearing frozen.
 */

import {
  collection,
  query,
  getDocs,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { parseProductFile } from "./productParser";
import { parseStockFile, aggregateStock } from "./stockParser";
import { parseCompanyFile } from "./companyParser";
import { parseCategoryFile } from "./categoryParser";
import { parseDrugFile } from "./drugParser";
import { mapProductToMedicine } from "./mappingEngine";
import type {
  SdfParseResult,
  StagedMedicine,
  StagedCategory,
  StagedBrand,
  SyncPreview,
} from "./types";

// ── Parsing orchestration ─────────────────────────────────────────────────────

export async function parseAllFiles(
  files: {
    product: string[];
    stock: string[];
    company: string[];
    category: string[];
    drug: string[];
  },
  onProgress?: (msg: string, processed: number, total: number) => void
): Promise<SdfParseResult> {
  onProgress?.("Parsing PRODUCT.SDF…", 0, files.product.length);
  const { products, errors: productErrors } = await parseProductFile(
    files.product,
    (processed, total) =>
      onProgress?.(`Parsing PRODUCT.SDF… (${processed.toLocaleString()}/${total.toLocaleString()})`, processed, total)
  );

  onProgress?.("Parsing STOCK.SDF…", 0, files.stock.length);
  const stockEntries = parseStockFile(files.stock);

  onProgress?.("Parsing master files…", 0, 3);
  const companies = parseCompanyFile(files.company);
  const categories = parseCategoryFile(files.category);
  const drugs = parseDrugFile(files.drug);

  const parseErrors = productErrors.map((e) => ({ line: e.line, raw: "", error: e.error }));
  return { products, stockEntries, companies, categories, drugs, parseErrors };
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

function normaliseName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

const MEDICINE_CHANGED_THRESHOLD_PRICE = 0.5;

function detectChangedFields(
  staged: Omit<StagedMedicine, "action" | "existingDocId" | "changedFields">,
  existing: Record<string, unknown>
): string[] {
  const changed: string[] = [];
  const exMrp = Number(existing.mrp) || 0;
  const exSell = Number(existing.sellingPrice) || 0;
  const exStockQty = Number(existing.stockQty) || 0;

  if (staged.mrp > 0 && Math.abs(exMrp - staged.mrp) > MEDICINE_CHANGED_THRESHOLD_PRICE) changed.push("mrp");
  if (staged.sellingPrice > 0 && Math.abs(exSell - staged.sellingPrice) > MEDICINE_CHANGED_THRESHOLD_PRICE) changed.push("sellingPrice");
  if (existing.stockStatus !== staged.stockStatus) changed.push("stockStatus");
  if (Math.abs(exStockQty - staged.stockQty) > 0) changed.push("stockQty");
  if (existing.categoryName !== staged.categoryName) changed.push("categoryName");
  if (existing.brand !== staged.brand) changed.push("brand");

  return changed;
}

// ── Paginated medicine reader ─────────────────────────────────────────────────

const READ_PAGE_SIZE = 500;
const READ_PAGE_DELAY_MS = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Reads all existing medicines from Firestore using cursor-based pagination.
 *
 * Why paginated instead of one getDocs() call:
 *   - A single getDocs() on 51k documents can timeout or immediately exhaust
 *     the daily read quota (50k reads/day on the Spark free plan).
 *   - Pagination spreads the reads into multiple resilient 500-doc requests
 *     with 150ms breathing room between pages so the quota meter doesn't
 *     spike all at once.
 *   - Progress is surfaced to the UI via onProgress so the admin can see
 *     "Loading existing medicines… (12,500 loaded)" rather than a frozen UI.
 */
async function fetchAllExistingMedicines(
  onProgress?: (msg: string) => void
): Promise<Record<string, unknown>[]> {
  if (!db) return [];

  const all: Record<string, unknown>[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  let pageNum = 0;

  onProgress?.("Loading existing medicines from Firestore…");

  while (true) {
    const constraints = cursor
      ? [limit(READ_PAGE_SIZE), startAfter(cursor)]
      : [limit(READ_PAGE_SIZE)];

    const snap = await getDocs(query(collection(db, "medicines"), ...constraints));
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    all.push(...docs);
    pageNum++;

    if (snap.docs.length > 0) {
      cursor = snap.docs[snap.docs.length - 1];
    }

    onProgress?.(
      `Loading existing medicines… (${all.length.toLocaleString()} loaded${snap.docs.length === READ_PAGE_SIZE ? ", more coming…" : ""})`
    );

    if (snap.docs.length < READ_PAGE_SIZE) break;

    // Brief pause between pages to avoid hammering Firestore quota
    await sleep(READ_PAGE_DELAY_MS);
  }

  onProgress?.(`Loaded ${all.length.toLocaleString()} existing medicines. Comparing…`);
  return all;
}

// ── Main staging function ─────────────────────────────────────────────────────

export async function buildSyncPreview(
  parsed: SdfParseResult,
  onProgress?: (msg: string) => void
): Promise<SyncPreview> {
  onProgress?.("Preparing… loading existing Firestore data.");

  // Load categories and brands in parallel (small collections, safe to fetch all at once)
  // Load medicines using the paginated reader (may be 50k+ docs)
  const [existingMedicines, existingCategoriesSnap, existingBrandsSnap] =
    await Promise.all([
      fetchAllExistingMedicines(onProgress),
      // Small collections — safe to getDocs all at once
      getDocs(query(collection(db!, "categories"), limit(2000))),
      getDocs(query(collection(db!, "brands"), limit(2000))),
    ]);

  const existingCategories = existingCategoriesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const existingBrands = existingBrandsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  onProgress?.("Building lookup maps…");

  const existingMedMap = new Map<string, Record<string, unknown>>();
  for (const m of existingMedicines) {
    existingMedMap.set(normaliseName(m.name as string), m as Record<string, unknown>);
  }

  const existingCatSet = new Set(
    existingCategories.map((c) => normaliseName((c as Record<string, unknown>).name as string))
  );
  const existingBrandSet = new Set(
    existingBrands.map((b) => normaliseName((b as Record<string, unknown>).name as string))
  );

  const stockMap = aggregateStock(parsed.stockEntries);

  onProgress?.("Comparing products with existing Firestore data…");

  const stagedMedicines: StagedMedicine[] = [];
  const neededCategories = new Set<string>();
  const neededBrands = new Set<string>();

  for (const product of parsed.products) {
    const mapped = mapProductToMedicine(product, stockMap);
    if (mapped.categoryName) neededCategories.add(mapped.categoryName);
    if (mapped.brand) neededBrands.add(mapped.brand);

    const key = normaliseName(mapped.name);
    const existing = existingMedMap.get(key);

    if (!existing) {
      stagedMedicines.push({ ...mapped, action: "create" });
    } else {
      const changed = detectChangedFields(mapped, existing);
      if (changed.length > 0) {
        stagedMedicines.push({
          ...mapped, action: "update",
          existingDocId: existing.id as string, changedFields: changed,
        });
      } else {
        stagedMedicines.push({ ...mapped, action: "skip", existingDocId: existing.id as string });
      }
    }
  }

  const stagedCategories: StagedCategory[] = [];
  for (const catName of neededCategories) {
    if (!existingCatSet.has(normaliseName(catName))) {
      stagedCategories.push({ action: "create", name: catName });
    }
  }

  const stagedBrands: StagedBrand[] = [];
  for (const brandName of neededBrands) {
    if (!existingBrandSet.has(normaliseName(brandName))) {
      stagedBrands.push({ action: "create", name: brandName });
    }
  }

  const toCreate = stagedMedicines.filter((m) => m.action === "create").length;
  const toUpdate = stagedMedicines.filter((m) => m.action === "update").length;
  const toSkip   = stagedMedicines.filter((m) => m.action === "skip").length;

  return {
    medicines: { total: stagedMedicines.length, toCreate, toUpdate, toSkip, items: stagedMedicines },
    categories: {
      total: stagedCategories.length,
      toCreate: stagedCategories.filter((c) => c.action === "create").length,
      items: stagedCategories,
    },
    brands: {
      total: stagedBrands.length,
      toCreate: stagedBrands.filter((b) => b.action === "create").length,
      items: stagedBrands,
    },
    parseErrors: parsed.parseErrors.length,
    stats: {
      totalProducts:     parsed.products.length,
      totalCompanies:    parsed.companies.length,
      totalCategories:   parsed.categories.length,
      totalDrugGroups:   parsed.drugs.length,
      totalStockRecords: parsed.stockEntries.length,
      productsWithStock: stockMap.size,
    },
  };
}
