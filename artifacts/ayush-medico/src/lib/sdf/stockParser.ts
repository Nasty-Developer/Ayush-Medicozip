/**
 * STOCK.SDF Parser
 *
 * Fixed-width layout (81 chars per line):
 *
 * Cols  0- 9  productId      (10 chars, right-justified int)
 * Cols 10-23  batchNo        (14 chars, left-justified)
 * Cols 24-31  qtyExpiry      (8 chars — strip qty + expiry MM/YYYY)
 * Cols 32-39  mrp            (8 chars, right-justified float)
 * Cols 40-47  purchaseRate   (8 chars, right-justified float)
 * Cols 48-52  discount       (5 chars, right-justified float)
 * Cols 53-60  sellingPrice   (8 chars, right-justified float)
 * Cols 61-64  padding
 * Cols 65-73  stockEntryId   (9 chars, right-justified int)
 *
 * ~10 871 records; each represents one batch of stock for a product.
 */

import { fieldFloat, fieldInt } from "./sdfReader";
import type { SdfStockEntry, ProductStock } from "./types";

const STOCK_LINE_LENGTH = 70; // minimum valid line length

/**
 * Parse the 8-char qty/expiry block.
 * Format variants observed:
 *   "1 0/   0"  →  qty=1, no expiry
 *   "1 4/4019"  →  qty=1, month=4, year=4019 (MediVision uses 40XX for 20XX)
 *   "111/4018"  →  qty=1, month=11, year=4018
 *   "212/4018"  →  qty=2, month=12, year=4018
 *
 * The year 40XX in MediVision seems to represent 20XX:
 *   4018 → 2018,  4019 → 2019,  4020 → 2020, etc.
 * Non-40XX years (e.g. 2029) are taken as-is.
 */
function parseQtyExpiry(raw: string): {
  stripQty: number;
  expiryMonth: number;
  expiryYear: number;
} {
  // First char is always the strip quantity
  const stripQty = parseInt(raw[0], 10) || 1;

  // Find slash — everything before is [qty digits + month], after is year
  const slashIdx = raw.indexOf("/");
  if (slashIdx < 0) {
    return { stripQty, expiryMonth: 0, expiryYear: 0 };
  }

  // Month: last 1-2 digits before the slash (excluding the first qty digit)
  const beforeSlash = raw.slice(1, slashIdx).trim();
  const expiryMonth = parseInt(beforeSlash, 10) || 0;

  // Year: 4 digits after slash
  const yearStr = raw.slice(slashIdx + 1).trim();
  let expiryYear = parseInt(yearStr, 10) || 0;
  // Convert MediVision's 40XX convention to 20XX
  if (expiryYear >= 4000 && expiryYear <= 4099) {
    expiryYear = expiryYear - 4000 + 2000;
  }

  return { stripQty, expiryMonth, expiryYear };
}

export function parseStockLine(line: string): SdfStockEntry | null {
  if (line.length < STOCK_LINE_LENGTH) return null;

  try {
    const productId = fieldInt(line, 0, 10);
    if (!productId) return null;

    const batchNo = line.slice(10, 24).trim();
    const qtyExpiryRaw = line.slice(24, 32);
    const { stripQty, expiryMonth, expiryYear } = parseQtyExpiry(qtyExpiryRaw);

    const mrp = fieldFloat(line, 32, 40);
    const purchaseRate = fieldFloat(line, 40, 48);
    const discount = fieldFloat(line, 48, 53);
    const sellingPrice = fieldFloat(line, 53, 61);
    const stockEntryId = fieldInt(line, 65, 74);

    return {
      productId,
      batchNo,
      qtyExpiryRaw,
      stripQty,
      expiryMonth,
      expiryYear,
      mrp,
      purchaseRate,
      discount,
      sellingPrice,
      stockEntryId,
    };
  } catch {
    return null;
  }
}

export function parseStockFile(lines: string[]): SdfStockEntry[] {
  const entries: SdfStockEntry[] = [];
  for (const line of lines) {
    const e = parseStockLine(line);
    if (e) entries.push(e);
  }
  return entries;
}

/**
 * Aggregate STOCK entries by productId.
 * Uses the entry with the highest stockEntryId as "latest".
 */
export function aggregateStock(entries: SdfStockEntry[]): Map<number, ProductStock> {
  const map = new Map<number, ProductStock>();

  for (const e of entries) {
    const existing = map.get(e.productId);
    if (!existing) {
      map.set(e.productId, {
        productId: e.productId,
        totalQty: e.stripQty,
        batchCount: 1,
        mrp: e.mrp,
        sellingPrice: e.sellingPrice,
        latestEntryId: e.stockEntryId,
      });
    } else {
      existing.totalQty += e.stripQty;
      existing.batchCount += 1;
      // Use the batch with the highest entry ID as the source of prices
      if (e.stockEntryId > existing.latestEntryId) {
        existing.latestEntryId = e.stockEntryId;
        existing.mrp = e.mrp;
        existing.sellingPrice = e.sellingPrice;
      }
    }
  }

  return map;
}
