/**
 * General Healthcare Products Schema
 *
 * Stores manually managed general health & daily products:
 * Chocolates, Energy Drinks, Diapers, Personal Care, Medical Devices, etc.
 * Admin can add/edit/delete these via the admin panel.
 */
import { pgTable, serial, integer, text, numeric, boolean, timestamp, index, } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.js";
export const generalProductsTable = pgTable("general_products", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    brand: text("brand"),
    description: text("description"),
    categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    /**
     * Sub-category for quick classification.
     * e.g. "Chocolates", "Energy Drinks", "Baby Care", "Medical Devices", etc.
     */
    subCategory: text("sub_category"),
    packing: text("packing"),
    mrp: numeric("mrp", { precision: 10, scale: 2 }),
    sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }),
    discount: numeric("discount", { precision: 5, scale: 2 }),
    stockStatus: text("stock_status", {
        enum: ["in_stock", "out_of_stock"],
    }).default("in_stock").notNull(),
    stockQty: integer("stock_qty").default(0).notNull(),
    imageUrl: text("image_url"),
    featured: boolean("featured").default(false).notNull(),
    newArrival: boolean("new_arrival").default(false).notNull(),
    status: text("status", { enum: ["active", "deleted"] }).default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    index("general_products_category_idx").on(t.categoryId),
    index("general_products_status_idx").on(t.status),
    index("general_products_name_idx").on(t.name),
    index("general_products_sub_category_idx").on(t.subCategory),
    index("general_products_featured_idx").on(t.featured),
]);
