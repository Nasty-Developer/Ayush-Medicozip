import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * Testimonials — replaces the Firestore "testimonials" collection used by
 * the admin TestimonialsPage. Public homepage testimonials remain a
 * hardcoded array (pre-existing behavior, out of scope for this migration).
 */
export const testimonialsTable = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  content: text("content").notNull(),
  rating: integer("rating").default(5).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertTestimonial = typeof testimonialsTable.$inferInsert;
export type Testimonial = typeof testimonialsTable.$inferSelect;
