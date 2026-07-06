import { pgTable, serial, text, integer, numeric, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { productsTable } from "./products";

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").default("Home").notNull(),
  houseNumber: text("house_number"),
  street: text("street"),
  landmark: text("landmark"),
  pincode: text("pincode").notNull(),
  city: text("city").default("Mumbai").notNull(),
  state: text("state").default("Maharashtra").notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
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

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(), // AYM-2026-000123
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  whatsappNumber: text("whatsapp_number"),
  addressId: integer("address_id").references(() => addressesTable.id, { onDelete: "set null" }),
  fullAddress: text("full_address"),
  deliveryInstructions: text("delivery_instructions"),
  deliveryEligible: boolean("delivery_eligible"),
  status: text("status").default("new").notNull(),
  source: text("source", { enum: ["website", "whatsapp", "email"] }).default("website").notNull(),
  prescriptionUrl: text("prescription_url"),
  hasPrescription: boolean("has_prescription").default(false).notNull(),
  medicinePhotoUrl: text("medicine_photo_url"),
  notes: text("notes"),
  couponId: integer("coupon_id").references(() => couponsTable.id, { onDelete: "set null" }),
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  deliveryCharge: numeric("delivery_charge", { precision: 10, scale: 2 }),
  discountAmount: numeric("discount_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  grandTotal: numeric("grand_total", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status", {
    enum: ["pending", "received", "failed", "refunded"],
  }).default("pending").notNull(),
  firestoreId: text("firestore_id").unique(), // bridge: links to Firestore "inquiries" doc
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
  productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
  medicineName: text("medicine_name").notNull(),
  medicineStrength: text("medicine_strength"),
  medicineBrand: text("medicine_brand"),
  quantity: text("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }),
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertOrderItem = typeof orderItemsTable.$inferInsert;
export type OrderItem = typeof orderItemsTable.$inferSelect;
