import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const drugGroupsTable = pgTable("drug_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type InsertDrugGroup = typeof drugGroupsTable.$inferInsert;
export type DrugGroup = typeof drugGroupsTable.$inferSelect;
