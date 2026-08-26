/**
 * Veterinary Medicines Schema
 *
 * Stores manually managed veterinary medicine products.
 * Separate from the pharmacy medicines catalogue (which is SDF-imported).
 * Admin can add/edit/delete these via the admin panel.
 */
import { pgTable, serial, integer, text, numeric, boolean, timestamp, index, } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories.js";
export const vetMedicinesTable = pgTable("vet_medicines", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    genericName: text("generic_name"),
    brand: text("brand"),
    categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
    /** Target animal species — e.g. "Dog", "Cat", "Cow", "Bird", etc. */
    animalType: text("animal_type"),
    prescriptionRequired: boolean("prescription_required").default(false).notNull(),
    packing: text("packing"),
    mrp: numeric("mrp", { precision: 10, scale: 2 }),
    sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }),
    discount: numeric("discount", { precision: 5, scale: 2 }),
    stockStatus: text("stock_status", {
        enum: ["in_stock", "low_stock", "out_of_stock"],
    }).default("out_of_stock").notNull(),
    stockQty: integer("stock_qty").default(0).notNull(),
    imageUrl: text("image_url"),
    featured: boolean("featured").default(false).notNull(),
    newArrival: boolean("new_arrival").default(false).notNull(),
    status: text("status", { enum: ["active", "deleted"] }).default("active").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    index("vet_medicines_category_idx").on(t.categoryId),
    index("vet_medicines_status_idx").on(t.status),
    index("vet_medicines_name_idx").on(t.name),
    index("vet_medicines_animal_type_idx").on(t.animalType),
    index("vet_medicines_featured_idx").on(t.featured),
]);
