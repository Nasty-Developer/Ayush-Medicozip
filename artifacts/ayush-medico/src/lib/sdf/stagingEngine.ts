/**
 * Staging Engine
 *
 * Compares parsed SDF data with existing Firestore data to produce a
 * SyncPreview describing what will be created, updated, or skipped.
 * Nothing is written to Firestore here.
 */

import { getCollection } from "@/lib/firestoreHelpers";
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
    (processed, total) => onProgress?.(`Parsing PRODUCT.SDF… (${processed.toLocaleString()}/${total.toLocaleString()})`, processed, total)
  );

  onProgress?.("Parsing STOCK.SDF…", 0, files.stock.length);
  const stockEntries = parseStockFile(files.stock);

  onProgress?.("Parsing master files…", 0, 3);
  const companies = parseCompanyFile(files.company);
  const categories = parseCategoryFile(files.category);
  const drugs = parseDrugFile(files.drug);

  const parseErrors = productErrors.map((e) => ({
    line: e.line,
    raw: "",
    error: e.error,
  }));

  return { products, stockEntries, companies, categories, drugs, parseErrors };
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

/** Normalise a medicine name for deduplication matching */
function normaliseName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

const MEDICINE_CHANGED_THRESHOLD_PRICE = 0.5; // ₹ tolerance for price changes

function detectChangedFields(
  staged: Omit<StagedMedicine, "action" | "existingDocId" | "changedFields">,
  existing: Record<string, unknown>
): string[] {
  const changed: string[] = [];

  const exMrp = Number(existing.mrp) || 0;
  const exSell = Number(existing.sellingPrice) || 0;
  const exStockQty = Number(existing.stockQty) || 0;

  if (staged.mrp > 0 && Math.abs(exMrp - staged.mrp) > MEDICINE_CHANGED_THRESHOLD_PRICE)
    changed.push("mrp");
  if (staged.sellingPrice > 0 && Math.abs(exSell - staged.sellingPrice) > MEDICINE_CHANGED_THRESHOLD_PRICE)
    changed.push("sellingPrice");
  if (existing.stockStatus !== staged.stockStatus) changed.push("stockStatus");
  if (Math.abs(exStockQty - staged.stockQty) > 0) changed.push("stockQty");
  if (existing.categoryName !== staged.categoryName) changed.push("categoryName");
  if (existing.brand !== staged.brand) changed.push("brand");

  return changed;
}

// ── Main staging function ─────────────────────────────────────────────────────

export async function buildSyncPreview(
  parsed: SdfParseResult,
  onProgress?: (msg: string) => void
): Promise<SyncPreview> {
  onProgress?.("Loading existing Firestore data…");

  // Load existing data in parallel
  const [existingMedicines, existingCategories, existingBrands] =
    await Promise.all([
      getCollection("medicines"),
      getCollection("categories"),
      getCollection("brands"),
    ]);

  onProgress?.("Building lookup maps…");

  // Build name → doc maps for quick lookup
  const existingMedMap = new Map<string, Record<string, unknown>>();
  for (const m of existingMedicines) {
    existingMedMap.set(normaliseName(m.name as string), m as Record<string, unknown>);
  }

  const existingCatSet = new Set(
    existingCategories.map((c) => normaliseName(c.name as string))
  );
  const existingBrandSet = new Set(
    existingBrands.map((b) => normaliseName(b.name as string))
  );

  // Aggregate stock
  const stockMap = aggregateStock(parsed.stockEntries);

  onProgress?.("Comparing products with Firestore…");

  // ── Stage medicines ──────────────────────────────────────────────────────────
  const stagedMedicines: StagedMedicine[] = [];
  // Track which company/category names are needed (for brand/category staging)
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
          ...mapped,
          action: "update",
          existingDocId: existing.id as string,
          changedFields: changed,
        });
      } else {
        stagedMedicines.push({
          ...mapped,
          action: "skip",
          existingDocId: existing.id as string,
        });
      }
    }
  }

  // ── Stage categories ─────────────────────────────────────────────────────────
  const stagedCategories: StagedCategory[] = [];
  for (const catName of neededCategories) {
    const key = normaliseName(catName);
    if (!existingCatSet.has(key)) {
      stagedCategories.push({ action: "create", name: catName });
    }
  }

  // ── Stage brands ──────────────────────────────────────────────────────────────
  const stagedBrands: StagedBrand[] = [];
  for (const brandName of neededBrands) {
    const key = normaliseName(brandName);
    if (!existingBrandSet.has(key)) {
      stagedBrands.push({ action: "create", name: brandName });
    }
  }

  const toCreate = stagedMedicines.filter((m) => m.action === "create").length;
  const toUpdate = stagedMedicines.filter((m) => m.action === "update").length;
  const toSkip = stagedMedicines.filter((m) => m.action === "skip").length;

  return {
    medicines: {
      total: stagedMedicines.length,
      toCreate,
      toUpdate,
      toSkip,
      items: stagedMedicines,
    },
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
      totalProducts: parsed.products.length,
      totalCompanies: parsed.companies.length,
      totalCategories: parsed.categories.length,
      totalDrugGroups: parsed.drugs.length,
      totalStockRecords: parsed.stockEntries.length,
      productsWithStock: stockMap.size,
    },
  };
}
