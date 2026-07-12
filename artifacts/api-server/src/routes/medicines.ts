/**
 * Medicine Catalogue API — serves all public medicine/category data from PostgreSQL.
 *
 * Endpoints:
 *   GET /api/medicines              paginated list with filter & sort
 *   GET /api/medicines/search       full-text search (name, generic, brand)
 *   GET /api/medicines/featured     featured=true medicines
 *   GET /api/medicines/new-arrivals newArrival=true medicines
 *   GET /api/medicines/special      special=true medicines
 *   GET /api/medicines/:id          single medicine by PG numeric id
 *   GET /api/medicines/:id/related  other medicines in the same category
 *   GET /api/categories             all enabled categories with medicine counts
 *   GET /api/category/:slug         medicines for a category by slug
 *   GET /api/search                 alias for /api/medicines/search
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  medicinesTable,
  categoriesTable,
  companiesTable,
  type Medicine,
} from "@workspace/db";
import { eq, ilike, or, and, desc, asc, sql, ne, type SQL } from "drizzle-orm";
import { logger } from "../lib/logger";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const LOW_STOCK_THRESHOLD = 10;

/** Map a DB medicine row to the shape the frontend expects (CategoryMedicine). */
function toPublicMedicine(
  m: Medicine & { companyName?: string | null; categoryName?: string | null; categoryImageUrl?: string | null }
) {
  const stockQty = m.stockQty ?? 0;
  let stockStatus: "in_stock" | "low_stock" | "out_of_stock" = m.stockStatus as "in_stock" | "low_stock" | "out_of_stock";
  if (stockStatus === "in_stock" && stockQty <= LOW_STOCK_THRESHOLD && stockQty > 0) {
    stockStatus = "low_stock";
  }

  return {
    id: String(m.id),
    name: m.name,
    brand: m.companyName ?? null,
    description: m.genericName ?? null,
    imageUrl: m.imageUrl ?? null,
    categoryImageUrl: m.categoryImageUrl ?? null,
    categoryName: m.categoryName ?? null,
    packInfo: m.packing ?? null,
    mrp: m.mrp ? Number(m.mrp) : null,
    sellingPrice: m.sellingPrice ? Number(m.sellingPrice) : null,
    discount: m.discount ? Number(m.discount) : null,
    stockStatus,
    stockQty,
    available: stockStatus !== "out_of_stock",
    prescriptionRequired: m.prescriptionRequired,
    featured: m.featured,
    showInNewArrivals: m.newArrival,
    showInSpecialMedicines: m.special,
    order: 0,
  };
}

/** Build the stock-priority sort: in_stock first, then low_stock, then out_of_stock. */
const STOCK_ORDER = sql`
  CASE
    WHEN ${medicinesTable.stockStatus} = 'in_stock'     THEN 0
    WHEN ${medicinesTable.stockStatus} = 'low_stock'    THEN 1
    WHEN ${medicinesTable.stockStatus} = 'out_of_stock' THEN 2
    ELSE 3
  END
`;

/** Join medicines with company and category names (+ category imageUrl). */
async function fetchMedicinesWithJoins(where?: SQL, limit = 50, offset = 0, extraOrder?: SQL) {
  const rows = await db
    .select({
      m: medicinesTable,
      companyName: companiesTable.name,
      categoryName: categoriesTable.name,
      categoryImageUrl: categoriesTable.imageUrl,
    })
    .from(medicinesTable)
    .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
    .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
    .where(and(eq(medicinesTable.status, "active"), where ?? sql`true`))
    .orderBy(STOCK_ORDER, extraOrder ?? asc(medicinesTable.name))
    .limit(limit)
    .offset(offset);

  return rows.map((r) =>
    toPublicMedicine({ ...r.m, companyName: r.companyName, categoryName: r.categoryName, categoryImageUrl: r.categoryImageUrl })
  );
}

// ── GET /api/medicines ────────────────────────────────────────────────────────
// ?page=1 &limit=48 &category=:name &company=:name &search=:q &sort=name|price-low|price-high

router.get("/medicines", async (req: Request, res: Response): Promise<void> => {
  try {
    const page   = Math.max(1, parseInt(String(req.query.page  ?? "1"),  10));
    const limit  = Math.min(200, Math.max(1, parseInt(String(req.query.limit ?? "48"), 10)));
    const offset = (page - 1) * limit;

    const { category, company, search, sort } = req.query;

    const conditions: SQL[] = [];
    if (category) {
      const cat = await db
        .select({ id: categoriesTable.id })
        .from(categoriesTable)
        .where(eq(categoriesTable.name, String(category)))
        .limit(1);
      if (cat[0]) conditions.push(eq(medicinesTable.categoryId, cat[0].id));
      else { res.json({ data: [], total: 0, page, limit, hasMore: false }); return; }
    }
    if (company) {
      const co = await db
        .select({ id: companiesTable.id })
        .from(companiesTable)
        .where(eq(companiesTable.name, String(company)))
        .limit(1);
      if (co[0]) conditions.push(eq(medicinesTable.companyId, co[0].id));
    }
    if (search) {
      const q = `%${String(search)}%`;
      conditions.push(
        or(
          ilike(medicinesTable.name, q),
          ilike(medicinesTable.genericName, q),
        ) as SQL
      );
    }

    let extraOrder: SQL | undefined;
    if (sort === "name")       extraOrder = asc(medicinesTable.name);
    if (sort === "price-low")  extraOrder = asc(medicinesTable.sellingPrice);
    if (sort === "price-high") extraOrder = desc(medicinesTable.sellingPrice);

    const where = conditions.length ? and(...conditions) : undefined;

    const [data, [{ total }]] = await Promise.all([
      fetchMedicinesWithJoins(where, limit, offset, extraOrder),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(medicinesTable)
        .where(and(eq(medicinesTable.status, "active"), where ?? sql`true`)),
    ]);

    res.json({ data, total, page, limit, hasMore: offset + data.length < total });
  } catch (err) {
    logger.error({ err }, "GET /medicines failed");
    res.status(500).json({ error: "Failed to fetch medicines" });
  }
});

// ── GET /api/medicines/search ─────────────────────────────────────────────────
// ?q=:query &limit=20

router.get("/medicines/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const q     = String(req.query.q ?? "").trim();
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "20"), 10));

    if (!q) { res.json({ data: [] }); return; }

    const pattern = `%${q}%`;
    const data = await fetchMedicinesWithJoins(
      or(
        ilike(medicinesTable.name, pattern),
        ilike(medicinesTable.genericName, pattern),
      ) as SQL,
      limit,
      0
    );
    res.json({ data });
  } catch (err) {
    logger.error({ err }, "GET /medicines/search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

// ── GET /api/medicines/featured ───────────────────────────────────────────────

router.get("/medicines/featured", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(String(req.query.limit ?? "12"), 10);
    const data = await fetchMedicinesWithJoins(eq(medicinesTable.featured, true), limit, 0);
    res.json({ data });
  } catch (err) {
    logger.error({ err }, "GET /medicines/featured failed");
    res.status(500).json({ error: "Failed to fetch featured medicines" });
  }
});

// ── GET /api/medicines/new-arrivals ───────────────────────────────────────────

router.get("/medicines/new-arrivals", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(String(req.query.limit ?? "12"), 10);
    const data = await fetchMedicinesWithJoins(eq(medicinesTable.newArrival, true), limit, 0);
    res.json({ data });
  } catch (err) {
    logger.error({ err }, "GET /medicines/new-arrivals failed");
    res.status(500).json({ error: "Failed to fetch new arrivals" });
  }
});

// ── GET /api/medicines/special ────────────────────────────────────────────────

router.get("/medicines/special", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = parseInt(String(req.query.limit ?? "12"), 10);
    const data = await fetchMedicinesWithJoins(eq(medicinesTable.special, true), limit, 0);
    res.json({ data });
  } catch (err) {
    logger.error({ err }, "GET /medicines/special failed");
    res.status(500).json({ error: "Failed to fetch special medicines" });
  }
});

// ── GET /api/medicines/:id ────────────────────────────────────────────────────

router.get("/medicines/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id ?? "", 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid medicine id" }); return; }

    const rows = await db
      .select({
        m: medicinesTable,
        companyName: companiesTable.name,
        categoryName: categoriesTable.name,
      })
      .from(medicinesTable)
      .leftJoin(companiesTable, eq(medicinesTable.companyId, companiesTable.id))
      .leftJoin(categoriesTable, eq(medicinesTable.categoryId, categoriesTable.id))
      .where(and(eq(medicinesTable.id, id), eq(medicinesTable.status, "active")))
      .limit(1);

    if (!rows[0]) { res.status(404).json({ error: "Medicine not found" }); return; }
    const r = rows[0];
    res.json(toPublicMedicine({ ...r.m, companyName: r.companyName, categoryName: r.categoryName }));
  } catch (err) {
    logger.error({ err }, "GET /medicines/:id failed");
    res.status(500).json({ error: "Failed to fetch medicine" });
  }
});

// ── GET /api/medicines/:id/related ────────────────────────────────────────────

router.get("/medicines/:id/related", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseInt(req.params.id ?? "", 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid medicine id" }); return; }

    const [source] = await db
      .select({ categoryId: medicinesTable.categoryId })
      .from(medicinesTable)
      .where(eq(medicinesTable.id, id))
      .limit(1);

    if (!source?.categoryId) { res.json({ data: [] }); return; }

    const data = await fetchMedicinesWithJoins(
      and(
        eq(medicinesTable.categoryId, source.categoryId),
        ne(medicinesTable.id, id),
      ) as SQL,
      8,
      0
    );
    res.json({ data });
  } catch (err) {
    logger.error({ err }, "GET /medicines/:id/related failed");
    res.status(500).json({ error: "Failed to fetch related medicines" });
  }
});

// ── GET /api/categories ───────────────────────────────────────────────────────
// Returns all enabled categories with medicine counts.

router.get("/categories", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db
      .select({
        id:           categoriesTable.id,
        name:         categoriesTable.name,
        slug:         categoriesTable.slug,
        description:  categoriesTable.description,
        imageUrl:     categoriesTable.imageUrl,
        icon:         categoriesTable.icon,
        color:        categoriesTable.color,
        enabled:      categoriesTable.enabled,
        displayOrder: categoriesTable.displayOrder,
        count:        sql<number>`count(${medicinesTable.id})::int`,
      })
      .from(categoriesTable)
      .leftJoin(
        medicinesTable,
        and(
          eq(medicinesTable.categoryId, categoriesTable.id),
          eq(medicinesTable.status, "active"),
        )
      )
      .where(eq(categoriesTable.enabled, true))
      .groupBy(categoriesTable.id)
      .orderBy(asc(categoriesTable.displayOrder), asc(categoriesTable.name));

    const data = rows.map((r) => ({
      id:          String(r.id),
      name:        r.name,
      slug:        r.slug,
      description: r.description ?? "",
      imageUrl:    r.imageUrl ?? null,
      icon:        r.icon,
      color:       r.color,
      order:       r.displayOrder,
      enabled:     r.enabled,
      count:       r.count,
    }));

    res.json({ data });
  } catch (err) {
    logger.error({ err }, "GET /categories failed");
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// ── GET /api/category/:slug ───────────────────────────────────────────────────
// Paginated medicines for one category (identified by slug).

router.get("/category/:slug", async (req: Request, res: Response): Promise<void> => {
  try {
    const slug   = req.params.slug ?? "";
    const page   = Math.max(1, parseInt(String(req.query.page  ?? "1"),  10));
    const limit  = Math.min(200, parseInt(String(req.query.limit ?? "50"), 10));
    const offset = (page - 1) * limit;
    const sort   = String(req.query.sort ?? "default");

    const [cat] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug))
      .limit(1);

    if (!cat) { res.status(404).json({ error: "Category not found" }); return; }

    let extraOrder: SQL | undefined;
    if (sort === "name")       extraOrder = asc(medicinesTable.name);
    if (sort === "price-low")  extraOrder = asc(medicinesTable.sellingPrice);
    if (sort === "price-high") extraOrder = desc(medicinesTable.sellingPrice);

    const where = eq(medicinesTable.categoryId, cat.id);

    const [data, [{ total }]] = await Promise.all([
      fetchMedicinesWithJoins(where, limit, offset, extraOrder),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(medicinesTable)
        .where(and(eq(medicinesTable.status, "active"), where)),
    ]);

    res.json({
      category: {
        id: String(cat.id), name: cat.name, slug: cat.slug,
        icon: cat.icon, color: cat.color, description: cat.description ?? "",
      },
      data,
      total,
      page,
      limit,
      hasMore: offset + data.length < total,
    });
  } catch (err) {
    logger.error({ err }, "GET /category/:slug failed");
    res.status(500).json({ error: "Failed to fetch category medicines" });
  }
});

// ── GET /api/search ───────────────────────────────────────────────────────────
// Top-level alias for /api/medicines/search

router.get("/search", async (req: Request, res: Response): Promise<void> => {
  try {
    const q     = String(req.query.q ?? "").trim();
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "20"), 10));

    if (!q) { res.json({ data: [] }); return; }

    const pattern = `%${q}%`;
    const data = await fetchMedicinesWithJoins(
      or(
        ilike(medicinesTable.name, pattern),
        ilike(medicinesTable.genericName, pattern),
      ) as SQL,
      limit,
      0
    );
    res.json({ data });
  } catch (err) {
    logger.error({ err }, "GET /search failed");
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
