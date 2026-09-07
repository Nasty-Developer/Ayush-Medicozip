import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const companiesTable = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertCompany = typeof companiesTable.$inferInsert;
export type Company = typeof companiesTable.$inferSelect;
