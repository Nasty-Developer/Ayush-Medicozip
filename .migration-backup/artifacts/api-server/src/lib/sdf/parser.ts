/**
 * Streaming MediVision Gold SDF parser.
 *
 * The upload layer stores files as PostgreSQL chunks. The importer supplies
 * those chunks through a fresh async source for each pass. This parser never
 * decodes a complete file into one string or splits a complete file into an
 * array of lines.
 */

import { normalizeCategory } from "./categoryNormalizer.js";

export interface ParsedMedicine {
  sdfProductId: number;
  name: string;
  brand: string;
  description: string;
  packInfo: string;
  stockStatus: "in_stock" | "out_of_stock";
  available: boolean;
  sellingPrice: number;
  mrp: number;
  discount: number;
  categoryName: string;
  prescriptionRequired: boolean;
  stockQty: number;
}

export interface SdfImportStats {
  products: number;
  stock: number;
  companies: number;
  categories: number;
  drugs: number;
}

export type SdfChunkSource = () => AsyncIterable<Buffer>;

export interface SdfImportPlan {
  stats: SdfImportStats;
  parseErrors: number;
  allCategoryNames: string[];
  allBrandNames: string[];
  allGenericNames: string[];
  medicineBatches(batchSize: number): AsyncGenerator<ParsedMedicine[], void, void>;
}

interface SdfProduct {
  recordId: number;
  name: string;
  companyName: string;
  categoryName: string;
  genericName: string;
  packUnit: string;
  packQty: number;
  mrpFromProduct: number;
}

interface ProductStock {
  totalQty: number;
  mrp: number;
  sellingPrice: number;
  latestEntryId: number;
}

function field(line: string, start: number, end: number): string {
  return line.slice(start, end).trim();
}

function fieldFloat(line: string, start: number, end: number): number {
  const n = parseFloat(line.slice(start, end).trim());
  return Number.isNaN(n) ? 0 : n;
}

function fieldInt(line: string, start: number, end: number): number {
  const n = parseInt(line.slice(start, end).trim(), 10);
  return Number.isNaN(n) ? 0 : n;
}

function trailingId(line: string, minStart: number): number {
  const match = line.slice(minStart).trim().match(/\d+$/);
  return match ? parseInt(match[0]!, 10) : 0;
}

function parsePackInfo(raw: string): { packUnit: string; packQty: number } {
  const trimmed = raw.trim();
  const spaced = trimmed.match(/^(.*?)\s+(\d+)\s*$/);
  if (spaced) {
    return { packUnit: spaced[1]!.trim(), packQty: parseInt(spaced[2]!, 10) };
  }
  const compact = trimmed.match(/^(.*?)(\d+)$/);
  if (compact && compact[1]!.trim().length > 0) {
    return { packUnit: compact[1]!.trim(), packQty: parseInt(compact[2]!, 10) };
  }
  return { packUnit: trimmed, packQty: 1 };
}

function parseProductLine(line: string): SdfProduct | null {
  if (line.length < 400) return null;

  const name = field(line, 0, 74);
  if (!name) return null;

  const { packUnit, packQty } = parsePackInfo(line.slice(195, 216));
  return {
    recordId: trailingId(line, 480),
    name,
    companyName: field(line, 75, 105),
    categoryName: field(line, 105, 135),
    genericName: field(line, 135, 195),
    packUnit,
    packQty,
    mrpFromProduct: fieldFloat(line, 231, 235),
  };
}

function parseStockLine(line: string): {
  productId: number;
  stripQty: number;
  mrp: number;
  sellingPrice: number;
  stockEntryId: number;
} | null {
  if (line.length < 70) return null;
  const productId = fieldInt(line, 0, 10);
  if (!productId) return null;
  return {
    productId,
    stripQty: parseInt(line.slice(24, 32)[0] ?? "1", 10) || 1,
    mrp: fieldFloat(line, 32, 40),
    sellingPrice: fieldFloat(line, 53, 61),
    stockEntryId: fieldInt(line, 65, 74),
  };
}

/**
 * Yield lines from a sequence of binary chunks while retaining at most one
 * partial line plus the current database chunk. SDF records are newline-based.
 */
export async function* readSdfLines(
  chunks: AsyncIterable<Buffer>,
): AsyncGenerator<string, void, void> {
  let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  for await (const chunk of chunks) {
    const data = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    let lineStart = 0;

    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 10) continue;
      let lineEnd = i;
      if (lineEnd > lineStart && data[lineEnd - 1] === 13) lineEnd--;
      if (lineEnd > lineStart) {
        yield data.subarray(lineStart, lineEnd).toString("latin1");
      }
      lineStart = i + 1;
    }

    pending = lineStart < data.length ? data.subarray(lineStart) : Buffer.alloc(0);
  }

  if (pending.length) {
    yield pending.toString("latin1").replace(/\r$/, "");
  }
}

function addStock(
  stockMap: Map<number, ProductStock>,
  entry: NonNullable<ReturnType<typeof parseStockLine>>,
): void {
  const existing = stockMap.get(entry.productId);
  if (!existing) {
    stockMap.set(entry.productId, {
      totalQty: entry.stripQty,
      mrp: entry.mrp,
      sellingPrice: entry.sellingPrice,
      latestEntryId: entry.stockEntryId,
    });
    return;
  }

  existing.totalQty += entry.stripQty;
  if (entry.stockEntryId > existing.latestEntryId) {
    existing.latestEntryId = entry.stockEntryId;
    if (entry.mrp > 0) existing.mrp = entry.mrp;
    if (entry.sellingPrice > 0) existing.sellingPrice = entry.sellingPrice;
  }
}

function isPrescriptionRequired(product: SdfProduct): boolean {
  const categories = new Set(["NRX", "TUBERCULOSIS DRUGS", "BANNED DRUG", "H1"]);
  if (categories.has(product.categoryName.toUpperCase())) return true;
  return [
    /\bINJECTION\b/i,
    /\bINJ\b/i,
    /\bNARCOTIC\b/i,
    /\bPSYCHOTROPIC\b/i,
    /\bSCHEDULE\s+H\b/i,
  ].some((pattern) => pattern.test(product.genericName));
}

function formatPackInfo(unit: string, qty: number): string {
  if (!unit && qty <= 1) return "";
  if (!unit) return `${qty} units`;
  return qty <= 1 ? unit : `${unit} × ${qty}`;
}

function calcDiscount(mrp: number, sellingPrice: number): number {
  if (!mrp || mrp <= 0 || sellingPrice >= mrp) return 0;
  return Math.round(((mrp - sellingPrice) / mrp) * 100 * 100) / 100;
}

function toMedicine(
  product: SdfProduct,
  stockMap: Map<number, ProductStock>,
): ParsedMedicine {
  const stock = stockMap.get(product.recordId);
  const mrp = stock?.mrp ?? product.mrpFromProduct;
  const sellingPrice = stock?.sellingPrice ?? mrp;
  const normalizedCategory = normalizeCategory(
    product.categoryName,
    product.name,
    product.companyName,
  );

  return {
    sdfProductId: product.recordId,
    name: product.name,
    brand: product.companyName,
    description: product.genericName,
    packInfo: formatPackInfo(product.packUnit, product.packQty),
    mrp,
    sellingPrice,
    discount: calcDiscount(mrp, sellingPrice),
    stockStatus: stock && stock.totalQty > 0 ? "in_stock" : "out_of_stock",
    stockQty: stock?.totalQty ?? 0,
    prescriptionRequired: isPrescriptionRequired(product),
    available: product.name.length > 0 && product.name !== "DELETED",
    categoryName: normalizedCategory,
  };
}

function countNonEmptyLines(lines: AsyncIterable<string>): AsyncGenerator<string, void, void> {
  return (async function* (): AsyncGenerator<string, void, void> {
    for await (const line of lines) {
      if (line.trim()) yield line;
    }
  })();
}

/**
 * Read the small metadata passes and return a reusable, bounded two-pass plan.
 * Product records are parsed once for metadata and once in bounded medicine
 * batches; neither pass retains the complete catalogue.
 */
export async function prepareSdfImport(files: {
  product: SdfChunkSource;
  stock: SdfChunkSource;
  company?: SdfChunkSource;
  category?: SdfChunkSource;
  drug?: SdfChunkSource;
}): Promise<SdfImportPlan> {
  const stockMap = new Map<number, ProductStock>();
  let stockCount = 0;

  for await (const line of readSdfLines(files.stock())) {
    try {
      const entry = parseStockLine(line);
      if (!entry) continue;
      addStock(stockMap, entry);
      stockCount++;
    } catch {
      // Ignore malformed stock records, matching the previous parser.
    }
  }

  const categoryNames = new Set<string>();
  const brandNames = new Set<string>();
  const genericNames = new Set<string>();
  let productCount = 0;
  let parseErrors = 0;

  for await (const line of readSdfLines(files.product())) {
    try {
      const product = parseProductLine(line);
      if (!product) continue;
      productCount++;
      categoryNames.add(
        normalizeCategory(product.categoryName, product.name, product.companyName),
      );
      if (product.companyName) brandNames.add(product.companyName);
      if (product.genericName.trim()) genericNames.add(product.genericName);
    } catch {
      parseErrors++;
    }
  }

  let companyCount = 0;
  if (files.company) {
    for await (const line of countNonEmptyLines(readSdfLines(files.company()))) {
      if (line.length >= 40 && field(line, 0, 30)) companyCount++;
    }
  }

  let categoryCount = 0;
  if (files.category) {
    for await (const line of countNonEmptyLines(readSdfLines(files.category()))) {
      if (line.trim().split(/\s+/).length >= 2) categoryCount++;
    }
  }

  let drugCount = 0;
  if (files.drug) {
    for await (const _line of countNonEmptyLines(readSdfLines(files.drug()))) {
      drugCount++;
    }
  }

  return {
    stats: {
      products: productCount,
      stock: stockCount,
      companies: companyCount,
      categories: categoryCount,
      drugs: drugCount,
    },
    parseErrors,
    allCategoryNames: Array.from(categoryNames),
    allBrandNames: Array.from(brandNames),
    allGenericNames: Array.from(genericNames),
    async *medicineBatches(batchSize: number): AsyncGenerator<ParsedMedicine[], void, void> {
      if (!Number.isInteger(batchSize) || batchSize <= 0) {
        throw new Error("SDF medicine batch size must be a positive integer.");
      }
      let batch: ParsedMedicine[] = [];
      for await (const line of readSdfLines(files.product())) {
        try {
          const product = parseProductLine(line);
          if (!product) continue;
          batch.push(toMedicine(product, stockMap));
          if (batch.length >= batchSize) {
            yield batch;
            batch = [];
          }
        } catch {
          // Metadata parsing records malformed product lines in parseErrors.
        }
      }
      if (batch.length) yield batch;
    },
  };
}