/**
 * PRODUCT.SDF Parser
 *
 * Fixed-width layout (486 chars per line, Windows CRLF):
 *
 * Cols  0- 73  name           (74 chars, left-justified)
 * Col  74      digitFlag      (1 char, usually '0')
 * Cols 75-104  companyName    (30 chars)
 * Cols105-134  categoryName   (30 chars)
 * Cols135-194  genericName    (60 chars)
 * Cols195-215  packInfo       (21 chars — unit left-justified, qty right)
 * Cols231-238  mrp            (8 chars, right-justified float)
 * Cols257-261  reorderLevel   (5 chars, right-justified int)
 * Cols262-266  minStock       (5 chars, right-justified int)
 * Cols267-276  shelfLocation  (10 chars)
 * Cols272-274  flags          (3 chars, e.g. "YNY")
 * Cols480+     recordId       (right-justified int, trailing)
 *
 * ~51 235 records in a typical export.
 */

import { field, fieldFloat, fieldInt, trailingId } from "./sdfReader";
import type { SdfProduct } from "./types";

const MIN_LINE_LENGTH = 400;

/** Parse the 21-char pack info block into a unit string and quantity */
function parsePackInfo(raw: string): { packUnit: string; packQty: number } {
  const trimmed = raw.trim();
  // Last token is qty if numeric; everything before is the unit
  const m = trimmed.match(/^(.*?)\s+(\d+)\s*$/);
  if (m) {
    return { packUnit: m[1].trim(), packQty: parseInt(m[2], 10) };
  }
  // No space-separated number — the whole string might end with digits
  const m2 = trimmed.match(/^(.*?)(\d+)$/);
  if (m2 && m2[1].trim().length > 0) {
    return { packUnit: m2[1].trim(), packQty: parseInt(m2[2], 10) };
  }
  return { packUnit: trimmed, packQty: 1 };
}

export function parseProductLine(
  line: string,
  lineNumber: number
): SdfProduct | null {
  if (line.length < MIN_LINE_LENGTH) return null;

  try {
    const name = field(line, 0, 74);
    if (!name) return null; // skip blank name lines

    const companyName = field(line, 75, 105);
    const categoryName = field(line, 105, 135);
    const genericName = field(line, 135, 195);

    const packRaw = line.slice(195, 216);
    const { packUnit, packQty } = parsePackInfo(packRaw);

    const mrpFromProduct = fieldFloat(line, 231, 235);
    const reorderLevel = fieldInt(line, 257, 262);
    const minStock = fieldInt(line, 262, 267);
    const shelfLocation = field(line, 267, 277);
    const rawFlags = field(line, 272, 275);
    const recordId = trailingId(line, 480);

    return {
      recordId,
      name,
      companyName,
      categoryName,
      genericName,
      packUnit,
      packQty,
      mrpFromProduct,
      reorderLevel,
      minStock,
      shelfLocation,
      rawFlags,
    };
  } catch {
    return null;
  }
}

/** Yield to the browser event loop to avoid blocking the UI thread. */
function yieldToUI(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

const PARSE_CHUNK_SIZE = 2000; // lines processed per chunk before yielding

export async function parseProductFile(
  lines: string[],
  onProgress?: (processed: number, total: number) => void
): Promise<{ products: SdfProduct[]; errors: Array<{ line: number; error: string }> }> {
  const products: SdfProduct[] = [];
  const errors: Array<{ line: number; error: string }> = [];
  const total = lines.length;

  for (let i = 0; i < total; i++) {
    const line = lines[i];
    if (line.length < MIN_LINE_LENGTH) continue;

    try {
      const p = parseProductLine(line, i + 1);
      if (p) products.push(p);
    } catch (err) {
      errors.push({
        line: i + 1,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Yield every PARSE_CHUNK_SIZE lines to keep the UI responsive
    if (i > 0 && i % PARSE_CHUNK_SIZE === 0) {
      onProgress?.(i, total);
      await yieldToUI();
    }
  }

  onProgress?.(total, total);
  return { products, errors };
}
