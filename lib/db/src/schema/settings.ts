import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

/**
 * Site-wide settings — key/value JSONB store.
 * Replaces the Firestore "settings" collection documents:
 *   key = "store"        → store contact / hours info
 *   key = "homepage"     → new-arrivals / special-medicines section config
 *   key = "announcement" → top-banner config
 */
export const settingsTable = pgTable("settings", {
  key:       text("key").primaryKey(),
  value:     jsonb("value").notNull().default({}),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertSetting = typeof settingsTable.$inferInsert;
export type Setting       = typeof settingsTable.$inferSelect;
