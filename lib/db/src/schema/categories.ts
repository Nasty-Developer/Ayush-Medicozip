import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull().unique(),
  slug:         text("slug").notNull().unique(),
  description:  text("description"),
  imageUrl:     text("image_url"),
  /** Emoji or icon string shown on the public site. */
  icon:         text("icon").default("💊").notNull(),
  /** Colour theme key used by the frontend (e.g. "primary", "secondary"). */
  color:        text("color").default("primary").notNull(),
  /** When false, the category is hidden from the public site. */
  enabled:      boolean("enabled").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull(),
});

export type InsertCategory = typeof categoriesTable.$inferInsert;
export type Category       = typeof categoriesTable.$inferSelect;
