import { pgTable, serial, text, timestamp, boolean, uuid } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firebaseUid: text("firebase_uid").unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  phone: text("phone"),
  role: text("role", { enum: ["customer", "admin"] }).default("customer").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type User = typeof usersTable.$inferSelect;

export const adminUsersTable = pgTable("admin_users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: text("role", { enum: ["admin", "superadmin"] }).default("admin").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertAdminUser = typeof adminUsersTable.$inferInsert;
export type AdminUser = typeof adminUsersTable.$inferSelect;
