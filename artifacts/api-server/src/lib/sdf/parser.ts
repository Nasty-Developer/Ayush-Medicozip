/**
 * Server-side MediVision Gold SDF Parser
 *
 * Parses the 5 fixed-width SDF export files (PRODUCT, STOCK, COMPANY,
 * CATEGORY, DRUG) from raw Node.js Buffers (latin-1 / Windows-1252 encoded).
 *
 * Returns a flat list of medicine documents ready to be written to Firestore,
 * plus new category and brand names.
 *
 * This is a pure TypeScript port of the browser-side parser — no File API,
 * no Firebase SDK, no browser globals.
 */

import { normalizeCategory } from "./categoryNormalizer";

// ── Types ─────────────────────────────────────────────────────────────────────

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

export interface ParseResult {
  medicines: ParsedMedicine[];
  allCategoryNames: string[];
  allBrandNames: string[];
  stats: {
    products: number;
    stock: number;
    companies: number;
    categories: number;
    drugs: number;
  };
  parseErrors: number;
}

// ── Buffer → lines ────────────────────────────────────────────────────────────

/** Decode a Node.js Buffer as latin-1 (Windows-1252 compatible, code points 0-255). */
function decodeBuffer(buf: Buffer): string[] {
  let text = "";
  for (let i = 0; i < buf.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    text += String.fromCharCode(buf[i]!);
  }
  return text
    .split("\n")
    .map((l) => l.replace(/\r$/, ""))
    .filter((l) => l.trim().length > 0);
}

// ── Fixed-width field helpers ─────────────────────────────────────────────────

function field(line: string, start: number, end: number): string {
  return line.slice(start, end).trim();
}

function fieldFloat(line: string, start: number, end: number): number {
  const raw = line.slice(start, end).trim();
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : n;
}

function fieldInt(line: string, start: number, end: number): number {
  const raw = line.slice(start, end).trim();
  const n = parseInt(raw, 10);
  return isNaN(n) ? 0 : n;
}

function trailingId(line: string, minStart: number): number {
  const raw = line.slice(minStart).trim();
  const m = raw.match(/\d+$/);
  if (!m) return 0;
  return parseInt(m[0], 10);
}

// ── PRODUCT.SDF parser ────────────────────────────────────────────────────────
// Fixed-width, 486 chars/line

interface SdfProduct {
  recordId: number;
  name: string;
  companyName: string;
  categoryName: string;
  genericName: string;
  packUnit: string;
  packQty: number;
  mrpFromProduct: number;
  rawFlags: string;
}

function parsePackInfo(raw: string): { packUnit: string; packQty: number } {
  const trimmed = raw.trim();
  const m = trimmed.match(/^(.*?)\s+(\d+)\s*$/);
  if (m) return { packUnit: m[1]!.trim(), packQty: parseInt(m[2]!, 10) };
  const m2 = trimmed.match(/^(.*?)(\d+)$/);
  if (m2 && m2[1]!.trim().length > 0)
    return { packUnit: m2[1]!.trim(), packQty: parseInt(m2[2]!, 10) };
  return { packUnit: trimmed, packQty: 1 };
}

function parseProducts(lines: string[]): { products: SdfProduct[]; errors: number } {
  const products: SdfProduct[] = [];
  let errors = 0;
  for (const line of lines) {
    if (line.length < 400) continue;
    try {
      const name = field(line, 0, 74);
      if (!name) continue;
      const companyName = field(line, 75, 105);
      const categoryName = field(line, 105, 135);
      const genericName = field(line, 135, 195);
      const packRaw = line.slice(195, 216);
      const { packUnit, packQty } = parsePackInfo(packRaw);
      const mrpFromProduct = fieldFloat(line, 231, 235);
      const rawFlags = field(line, 272, 275);
      const recordId = trailingId(line, 480);
      products.push({ recordId, name, companyName, categoryName, genericName, packUnit, packQty, mrpFromProduct, rawFlags });
    } catch {
      errors++;
    }
  }
  return { products, errors };
}

// ── STOCK.SDF parser ──────────────────────────────────────────────────────────
// Fixed-width, 81 chars/line

interface SdfStockEntry {
  productId: number;
  stripQty: number;
  mrp: number;
  sellingPrice: number;
  stockEntryId: number;
}

interface ProductStock {
  totalQty: number;
  mrp: number;
  sellingPrice: number;
  latestEntryId: number;
}

function parseQtyExpiry(raw: string): number {
  // First char is strip quantity
  return parseInt(raw[0] ?? "1", 10) || 1;
}

function parseStockLines(lines: string[]): SdfStockEntry[] {
  const entries: SdfStockEntry[] = [];
  for (const line of lines) {
    if (line.length < 70) continue;
    try {
      const productId = fieldInt(line, 0, 10);
      if (!productId) continue;
      const qtyRaw = line.slice(24, 32);
      const stripQty = parseQtyExpiry(qtyRaw);
      const mrp = fieldFloat(line, 32, 40);
      const sellingPrice = fieldFloat(line, 53, 61);
      const stockEntryId = fieldInt(line, 65, 74);
      entries.push({ productId, stripQty, mrp, sellingPrice, stockEntryId });
    } catch {
      // skip
    }
  }
  return entries;
}

function aggregateStock(entries: SdfStockEntry[]): Map<number, ProductStock> {
  const map = new Map<number, ProductStock>();
  for (const e of entries) {
    const existing = map.get(e.productId);
    if (!existing) {
      map.set(e.productId, {
        totalQty: e.stripQty,
        mrp: e.mrp,
        sellingPrice: e.sellingPrice,
        latestEntryId: e.stockEntryId,
      });
    } else {
      existing.totalQty += e.stripQty;
      if (e.stockEntryId > existing.latestEntryId) {
        existing.latestEntryId = e.stockEntryId;
        if (e.mrp > 0) existing.mrp = e.mrp;
        if (e.sellingPrice > 0) existing.sellingPrice = e.sellingPrice;
      }
    }
  }
  return map;
}

// ── CATEGORY.SDF parser ───────────────────────────────────────────────────────

function parseCategoryLines(lines: string[]): string[] {
  const names: string[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const name = parts.slice(0, -1).join(" ").trim();
    if (name) names.push(name);
  }
  return names;
}

// ── COMPANY.SDF parser ────────────────────────────────────────────────────────

function parseCompanyLines(lines: string[]): string[] {
  const names: string[] = [];
  for (const line of lines) {
    if (line.length < 40) continue;
    const name = field(line, 0, 30);
    if (name) names.push(name);
  }
  return names;
}

// ── Mapping engine ────────────────────────────────────────────────────────────

const RX_CATEGORIES = new Set(["NRX", "TUBERCULOSIS DRUGS", "BANNED DRUG", "H1"]);
const RX_KEYWORDS = [/\bINJECTION\b/i, /\bINJ\b/i, /\bNARCOTIC\b/i, /\bPSYCHOTROPIC\b/i, /\bSCHEDULE\s+H\b/i];

function isPrescriptionRequired(product: SdfProduct): boolean {
  if (RX_CATEGORIES.has(product.categoryName.toUpperCase())) return true;
  return RX_KEYWORDS.some((re) => re.test(product.genericName));
}

function formatPackInfo(unit: string, qty: number): string {
  if (!unit && qty <= 1) return "";
  if (!unit) return `${qty} units`;
  if (qty <= 1) return unit;
  return `${unit} × ${qty}`;
}

function calcDiscount(mrp: number, sell: number): number {
  if (!mrp || mrp <= 0 || sell >= mrp) return 0;
  return Math.round(((mrp - sell) / mrp) * 100 * 100) / 100;
}

// ── Main parse function ───────────────────────────────────────────────────────

export function parseSdfBuffers(files: {
  product: Buffer;
  stock: Buffer;
  company?: Buffer;
  category?: Buffer;
  drug?: Buffer;
}): ParseResult {
  const productLines = decodeBuffer(files.product);
  const stockLines = decodeBuffer(files.stock);
  const categoryLines = files.category ? decodeBuffer(files.category) : [];
  const companyLines = files.company ? decodeBuffer(files.company) : [];

  const { products, errors: parseErrors } = parseProducts(productLines);
  const stockEntries = parseStockLines(stockLines);
  const stockMap = aggregateStock(stockEntries);
  const parsedCategoryNames = parseCategoryLines(categoryLines);
  parsedCategoryNames.length; // used for stats

  const companyNames = parseCompanyLines(companyLines);
  companyNames.length;

  const medicines: ParsedMedicine[] = [];
  const seenCategories = new Set<string>();
  const seenBrands = new Set<string>();

  for (const product of products) {
    const stock = stockMap.get(product.recordId);
    const mrp = stock?.mrp ?? product.mrpFromProduct;
    const sellingPrice = stock?.sellingPrice ?? mrp;
    const discount = calcDiscount(mrp, sellingPrice);
    const stockStatus: "in_stock" | "out_of_stock" =
      stock && stock.totalQty > 0 ? "in_stock" : "out_of_stock";
    const stockQty = stock?.totalQty ?? 0;
    const available = product.name.length > 0 && product.name !== "DELETED";
    const prescriptionRequired = isPrescriptionRequired(product);
    const packInfo = formatPackInfo(product.packUnit, product.packQty);

    // Store the NORMALIZED category name so the DB receives "General Medicines",
    // "Cosmetics", etc. — exactly matching what medicines.categoryName will be.
    const normalizedCat = normalizeCategory(product.categoryName, product.name, product.companyName);
    seenCategories.add(normalizedCat);
    if (product.companyName) seenBrands.add(product.companyName);

    medicines.push({
      sdfProductId: product.recordId,
      name: product.name,
      brand: product.companyName,
      description: product.genericName,
      packInfo,
      mrp,
      sellingPrice,
      discount,
      stockStatus,
      stockQty,
      prescriptionRequired,
      available,
      categoryName: normalizeCategory(product.categoryName, product.name, product.companyName),
    });
  }

  return {
    medicines,
    allCategoryNames: Array.from(seenCategories),
    allBrandNames: Array.from(seenBrands),
    stats: {
      products: products.length,
      stock: stockEntries.length,
      companies: companyLines.length,
      categories: parsedCategoryNames.length,
      drugs: files.drug ? decodeBuffer(files.drug).length : 0,
    },
    parseErrors,
  };
}
