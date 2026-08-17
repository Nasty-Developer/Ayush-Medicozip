import { pgTable, serial, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { categoriesTable } from "./categories";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  brand: text("brand"),
  description: text("description"),
  imageUrl: text("image_url"),
  categoryId: integer("category_id").references(() => categoriesTable.id, { onDelete: "set null" }),
  stockStatus: text("stock_status", { enum: ["in_stock", "out_of_stock", "coming_soon"] })
    .default("in_stock")
    .notNull(),
  sellingPrice: numeric("selling_price", { precision: 10, scale: 2 }),
  mrp: numeric("mrp", { precision: 10, scale: 2 }),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
  showInNewArrivals: boolean("show_in_new_arrivals").default(false).notNull(),
  showInSpecialMedicines: boolean("show_in_special_medicines").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertProduct = typeof productsTable.$inferInsert;
export type Product = typeof productsTable.$inferSelect;

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id")
    .notNull()
    .unique()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").default(0).notNull(),
  reservedQuantity: integer("reserved_quantity").default(0).notNull(),
  reorderLevel: integer("reorder_level").default(10).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertInventory = typeof inventoryTable.$inferInsert;
export type Inventory = typeof inventoryTable.$inferSelect;
