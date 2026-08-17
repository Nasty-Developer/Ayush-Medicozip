import { pgTable, serial, text, integer, numeric, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  alternateNumber: text("alternate_number"),
  houseNumber: text("house_number").notNull(),
  buildingName: text("building_name"),
  street: text("street").notNull(),
  area: text("area"),
  landmark: text("landmark"),
  pincode: text("pincode").notNull(),
  city: text("city").default("Mumbai").notNull(),
  state: text("state").default("Maharashtra").notNull(),
  addressType: text("address_type", { enum: ["home", "work", "other"] }).default("home").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  lat: numeric("lat", { precision: 10, scale: 6 }),
  lng: numeric("lng", { precision: 10, scale: 6 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertAddress = typeof addressesTable.$inferInsert;
export type Address = typeof addressesTable.$inferSelect;

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  discountType: text("discount_type", { enum: ["flat", "percent"] }).notNull(),
  discountValue: numeric("discount_value", { precision: 10, scale: 2 }).notNull(),
  minimumOrderAmount: numeric("minimum_order_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  maximumDiscount: numeric("maximum_discount", { precision: 10, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").default(0).notNull(),
  validFrom: timestamp("valid_from"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertCoupon = typeof couponsTable.$inferInsert;
export type Coupon = typeof couponsTable.$inferSelect;

// ─── Phase 2 cart-based orders ──────────────────────────────────────────────
// Nested sub-objects (address/pricing/payment/prescription/delivery) are kept
// as JSONB so the shape the frontend already consumes (ported over from the
// Firestore `Order` type) can be preserved without a large UI rewrite.

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(), // AYM-2026-000123
  customerId: text("customer_id").notNull(), // Firebase UID
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone").notNull(),
  address: jsonb("address").notNull(),
  pricing: jsonb("pricing").notNull(),
  payment: jsonb("payment").notNull(),
  prescription: jsonb("prescription").notNull(),
  delivery: jsonb("delivery").notNull(),
  status: text("status").default("pending").notNull(),
  notes: text("notes"),
  source: text("source", { enum: ["website", "app"] }).default("website").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertOrder = typeof ordersTable.$inferInsert;
export type Order = typeof ordersTable.$inferSelect;

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => ordersTable.id, { onDelete: "cascade" }),
  medicineId: text("medicine_id"),
  medicineName: text("medicine_name").notNull(),
  categoryName: text("category_name"),
  brandName: text("brand_name"),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
  prescriptionRequired: boolean("prescription_required").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertOrderItem = typeof orderItemsTable.$inferInsert;
export type OrderItem = typeof orderItemsTable.$inferSelect;

// ─── Order notifications (replaces Firestore "notifications" collection) ────

export const notificationsTable = pgTable("order_notifications", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull(), // AYM-2026-000123 (human order id)
  orderDbId: integer("order_db_id").references(() => ordersTable.id, { onDelete: "set null" }),
  customerId: text("customer_id").notNull(),
  event: text("event").notNull(),
  eventLabel: text("event_label"),
  channels: jsonb("channels").notNull(),
  status: text("status").default("queued").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertNotification = typeof notificationsTable.$inferInsert;
export type Notification = typeof notificationsTable.$inferSelect;
