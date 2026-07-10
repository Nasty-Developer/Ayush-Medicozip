/**
 * MediVision Gold SDF Parser — TypeScript types
 *
 * These types represent parsed records from each SDF file exactly as
 * they come out of the parser, before any Firestore mapping.
 */

// ── Raw parsed records ───────────────────────────────────────────────────────

export interface SdfProduct {
  /** Sequential record ID from MediVision (last field in each line) */
  recordId: number;
  name: string;
  /** Company code / name stored inline in the product record */
  companyName: string;
  /** Category name string (e.g. "Allopathic", "Cosmetics") */
  categoryName: string;
  /** Generic / drug composition name */
  genericName: string;
  /** Pack unit string e.g. "30 ML", "CAP", "10 TAB" */
  packUnit: string;
  /** Pack quantity e.g. 12 (capsules per strip), 1 (single bottle) */
  packQty: number;
  /** MRP from product record (often 0.00 — prefer STOCK values) */
  mrpFromProduct: number;
  /** Reorder level */
  reorderLevel: number;
  /** Minimum stock level */
  minStock: number;
  /** Shelf location code */
  shelfLocation: string;
  /** Raw 3-char flags string (e.g. "YNY") */
  rawFlags: string;
}

export interface SdfStockEntry {
  /** Links to SdfProduct.recordId */
  productId: number;
  batchNo: string;
  /** Raw qty/expiry block, 8 chars – parsed separately */
  qtyExpiryRaw: string;
  /** Number of strips/units in this batch */
  stripQty: number;
  /** Expiry month (1-12, or 0 if unknown) */
  expiryMonth: number;
  /** Expiry year (4-digit, or 0 if unknown) */
  expiryYear: number;
  /** MRP in ₹ */
  mrp: number;
  /** Purchase / trade rate */
  purchaseRate: number;
  /** Discount percentage */
  discount: number;
  /** Selling price in ₹ */
  sellingPrice: number;
  /** Internal stock entry ID */
  stockEntryId: number;
}

export interface SdfCompany {
  companyId: number;
  name: string;
  /** 3-letter short code */
  code: string;
}

export interface SdfCategory {
  categoryId: number;
  name: string;
}

export interface SdfDrug {
  drugId: number;
  name: string;
  /** Raw 3-char flags */
  rawFlags: string;
}

// ── Aggregated / enriched ────────────────────────────────────────────────────

/** Stock summary for one product, aggregated from all its STOCK.SDF batches */
export interface ProductStock {
  productId: number;
  /** Total strips across all batches */
  totalQty: number;
  /** Batch count */
  batchCount: number;
  /** MRP from the latest batch */
  mrp: number;
  /** Selling price from the latest batch */
  sellingPrice: number;
  /** Entry ID of the most recent batch */
  latestEntryId: number;
}

// ── Parse result ─────────────────────────────────────────────────────────────

export interface SdfParseResult {
  products: SdfProduct[];
  stockEntries: SdfStockEntry[];
  companies: SdfCompany[];
  categories: SdfCategory[];
  drugs: SdfDrug[];
  /** Products that failed to parse */
  parseErrors: Array<{ line: number; raw: string; error: string }>;
}

// ── Staging / diff ───────────────────────────────────────────────────────────

export type SyncAction = "create" | "update" | "skip";

export interface StagedMedicine {
  action: SyncAction;
  sdfProductId: number;
  name: string;
  brand: string;
  categoryName: string;
  genericName: string;
  packInfo: string;
  mrp: number;
  sellingPrice: number;
  discount: number;
  stockStatus: "in_stock" | "out_of_stock";
  stockQty: number;
  prescriptionRequired: boolean;
  available: boolean;
  /** Existing Firestore doc ID (if updating) */
  existingDocId?: string;
  /** Fields that changed (if updating) */
  changedFields?: string[];
}

export interface StagedCategory {
  action: SyncAction;
  name: string;
  existingDocId?: string;
}

export interface StagedBrand {
  action: SyncAction;
  name: string;
  existingDocId?: string;
}

export interface SyncPreview {
  medicines: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
    items: StagedMedicine[];
  };
  categories: {
    total: number;
    toCreate: number;
    items: StagedCategory[];
  };
  brands: {
    total: number;
    toCreate: number;
    items: StagedBrand[];
  };
  parseErrors: number;
  /** Summary stats */
  stats: {
    totalProducts: number;
    totalCompanies: number;
    totalCategories: number;
    totalDrugGroups: number;
    totalStockRecords: number;
    productsWithStock: number;
  };
}

// ── Sync progress ────────────────────────────────────────────────────────────

export interface SyncProgress {
  phase: "idle" | "parsing" | "staging" | "syncing" | "done" | "error";
  message: string;
  processed: number;
  total: number;
  errors: string[];
}
