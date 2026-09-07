/**
 * Mapping Engine
 *
 * Maps parsed SDF records onto the Firestore medicine schema used by
 * the Ayush Medico app (medicines / categories / brands collections).
 *
 * Firestore medicine fields (from useAllMedicines / useMedicinesByCategory):
 *   name, brand, description, imageUrl, stockStatus, available,
 *   sellingPrice, mrp, discount, categoryName, order,
 *   prescriptionRequired, stockQty
 */

import type { SdfProduct, ProductStock, StagedMedicine } from "./types";

// Categories that imply prescription requirements
const RX_CATEGORIES = new Set([
  "NRX",
  "TUBERCULOSIS DRUGS",
  "BANNED DRUG",
  "H1",
]);

// Keywords in generic name that suggest prescription requirement
const RX_KEYWORDS = [
  /\bINJECTION\b/i,
  /\bINJ\b/i,
  /\bNARCOTIC\b/i,
  /\bPSYCHOTROPIC\b/i,
  /\bSCHEDULE\s+H\b/i,
];

function isPrescriptionRequired(product: SdfProduct): boolean {
  if (RX_CATEGORIES.has(product.categoryName.toUpperCase())) return true;
  for (const re of RX_KEYWORDS) {
    if (re.test(product.genericName)) return true;
  }
  return false;
}

/** Format pack info into a human-readable string */
function formatPackInfo(unit: string, qty: number): string {
  if (!unit && qty <= 1) return "";
  if (!unit) return `${qty} units`;
  if (qty <= 1) return unit;
  return `${unit} × ${qty}`;
}

/** Calculate discount percentage from MRP and selling price */
function calcDiscount(mrp: number, sell: number): number {
  if (!mrp || mrp <= 0 || sell >= mrp) return 0;
  return Math.round(((mrp - sell) / mrp) * 100 * 100) / 100; // 2 decimal places
}

/**
 * Map one SDF product + its aggregated stock info into a staged medicine
 * record ready for Firestore comparison.
 */
export function mapProductToMedicine(
  product: SdfProduct,
  stockMap: Map<number, ProductStock>
): Omit<StagedMedicine, "action" | "existingDocId" | "changedFields"> {
  const stock = stockMap.get(product.recordId);

  // Prefer STOCK prices; fall back to product-level MRP
  const mrp = stock?.mrp ?? product.mrpFromProduct;
  const sellingPrice = stock?.sellingPrice ?? mrp;
  const discount = calcDiscount(mrp, sellingPrice);

  const stockStatus: "in_stock" | "out_of_stock" = stock && stock.batchCount > 0
    ? "in_stock"
    : "out_of_stock";

  const stockQty = stock?.totalQty ?? 0;

  // Availability: skip products with obviously invalid names
  const available = product.name.length > 0 && product.name !== "DELETED";

  const prescriptionRequired = isPrescriptionRequired(product);

  const packInfo = formatPackInfo(product.packUnit, product.packQty);

  return {
    sdfProductId: product.recordId,
    name: product.name,
    brand: product.companyName,
    categoryName: product.categoryName,
    genericName: product.genericName,
    packInfo,
    mrp,
    sellingPrice,
    discount,
    stockStatus,
    stockQty,
    prescriptionRequired,
    available,
  };
}
