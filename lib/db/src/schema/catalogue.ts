/**
 * Medicine Catalogue Schema
 *
 * Stores the full SDF-imported medicine catalogue in PostgreSQL.
 * This replaces the Firestore "medicines" collection entirely.
 *
 * Key design decisions:
 *  - productCode (sdfProductId) is the natural key for upserts — the same
 *    MediVision record always maps to the same row, making re-imports safe.
 *  - companyId / categoryId / drugGroupId are FK-linked so category and
 *    company metadata can be queried efficiently.
 *  - stockQty and stockStatus are denormalised onto the medicine row for fast
 *    list queries; the stock table holds the raw per-batch data.
 *  - featured / newArrival / special are managed by the admin panel and are
 *    PRESERVED on every re-import (excluded from the ON CONFLICT SET clause).
 */

import {
  pgTable, serial, integer, text, numeric, boolean, timestamp, index,
} from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";
import { companiesTable } from "./companies";
import { drugGroupsTable } from "./drugGroups";

// ── Medicines ─────────────────────────────────────────────────────────────────

export const medicinesTable = pgTable(
  "medicines",
  {
    id:                  serial("id").primaryKey(),
    /** MediVision Gold product record ID — unique key for upsert. */
    productCode:         integer("product_code").notNull().unique(),
    name:                text("name").notNull(),
    genericName:         text("generic_name"),
    companyId:           integer("company_id").references(() => companiesTable.id, { onDelete: "set null" }),
    categoryId:          integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    drugGroupId:         integer("drug_group_id").references(() => drugGroupsTable.id, { onDelete: "set null" }),
    /** Packing info e.g. "Tablet × 10" */
    packing:             text("packing"),
    mrp:                 numeric("mrp",          { precision: 10, scale: 2 }),
    sellingPrice:        numeric("selling_price", { precision: 10, scale: 2 }),
    discount:            numeric("discount",      { precision: 5,  scale: 2 }),
    prescriptionRequired: boolean("prescription_required").default(false).notNull(),
    stockStatus:         text("stock_status", {
                           enum: ["in_stock", "low_stock", "out_of_stock"],
                         }).default("out_of_stock").notNull(),
    /** Aggregate quantity from STOCK.SDF — used only for low-stock threshold. */
    stockQty:            integer("stock_qty").default(0).notNull(),
    imageUrl:            text("image_url"),
    /** Admin-managed flags — preserved on re-import. */
    featured:            boolean("featured").default(false).notNull(),
    newArrival:          boolean("new_arrival").default(false).notNull(),
    special:             boolean("special").default(false).notNull(),
    status:              text("status", { enum: ["active", "deleted"] }).default("active").notNull(),
    createdAt:           timestamp("created_at").defaultNow().notNull(),
    updatedAt:           timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("medicines_category_idx").on(t.categoryId),
    index("medicines_company_idx").on(t.companyId),
    index("medicines_stock_status_idx").on(t.stockStatus),
    index("medicines_featured_idx").on(t.featured),
    index("medicines_new_arrival_idx").on(t.newArrival),
    index("medicines_special_idx").on(t.special),
    index("medicines_name_idx").on(t.name),
  ]
);

export type InsertMedicine = typeof medicinesTable.$inferInsert;
export type Medicine      = typeof medicinesTable.$inferSelect;

// ── Stock ─────────────────────────────────────────────────────────────────────

export const stockTable = pgTable("stock", {
  id:            serial("id").primaryKey(),
  medicineId:    integer("medicine_id").notNull().references(() => medicinesTable.id, { onDelete: "cascade" }),
  batchNo:       text("batch_no"),
  expiry:        text("expiry"),
  quantity:      integer("quantity").default(0).notNull(),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  sellingPrice:  numeric("selling_price",  { precision: 10, scale: 2 }),
  mrp:           numeric("mrp",            { precision: 10, scale: 2 }),
  lastUpdated:   timestamp("last_updated").defaultNow().notNull(),
});

export type InsertStock = typeof stockTable.$inferInsert;
export type Stock       = typeof stockTable.$inferSelect;
