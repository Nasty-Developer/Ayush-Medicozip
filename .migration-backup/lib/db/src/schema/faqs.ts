import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

/**
 * FAQs — replaces the Firestore "faqs" collection used by the admin FAQPage.
 * Public homepage FAQ remains a hardcoded array (pre-existing behavior, out
 * of scope for this migration).
 */
export const faqsTable = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  order: integer("order").default(0).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertFaq = typeof faqsTable.$inferInsert;
export type Faq = typeof faqsTable.$inferSelect;
