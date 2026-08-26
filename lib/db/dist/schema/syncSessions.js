import { index, pgTable, text, timestamp, uniqueIndex, } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const syncSessionsTable = pgTable("sync_sessions", {
    id: text("id").primaryKey(),
    firebaseUid: text("firebase_uid").notNull(),
    status: text("status", {
        enum: ["uploading", "running", "completed", "failed", "cancelled", "expired"],
    })
        .default("uploading")
        .notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    expiresAt: timestamp("expires_at").notNull(),
}, (table) => [
    index("sync_sessions_firebase_uid_idx").on(table.firebaseUid),
    uniqueIndex("sync_sessions_one_active_per_user_idx")
        .on(table.firebaseUid)
        .where(sql `${table.status} in ('uploading', 'running')`),
]);
