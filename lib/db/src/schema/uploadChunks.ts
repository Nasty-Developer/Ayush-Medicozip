import {
  pgTable, text, integer, timestamp, primaryKey, customType,
} from "drizzle-orm/pg-core";

/**
 * Temporary binary chunk storage for large SDF file uploads.
 *
 * Vercel serverless functions have a hard 4.5 MB request body limit.
 * Large SDF files (e.g. PRODUCT.SDF ≈ 24 MB) must be split into ≤3 MB
 * chunks on the frontend and uploaded one chunk per request.
 *
 * Lifecycle:
 *  1. Frontend creates a session (POST /api/sync/session → sessionId).
 *  2. For each file: split into CHUNK_SIZE pieces, POST /api/sync/chunk
 *     once per piece with { sessionId, fileKey, chunkIndex, totalChunks }.
 *  3. Frontend calls POST /api/sync/start with { sessionId }.
 *  4. Backend assembles chunks from this table, runs the import, then
 *     DELETEs all rows for the session.
 *
 * Rows are automatically cleaned up on import. A cron or startup hook
 * can also prune rows older than 24 h for crash-recovery hygiene.
 */

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() { return "bytea"; },
});

export const uploadChunksTable = pgTable(
  "upload_chunks",
  {
    sessionId:   text("session_id").notNull(),
    /** Matches the SDF field key: product_sdf | stock_sdf | company_sdf | category_sdf | drug_sdf */
    fileKey:     text("file_key").notNull(),
    chunkIndex:  integer("chunk_index").notNull(),
    totalChunks: integer("total_chunks").notNull(),
    data:        bytea("data").notNull(),
    createdAt:   timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.sessionId, t.fileKey, t.chunkIndex] }),
  ]
);

export type InsertUploadChunk = typeof uploadChunksTable.$inferInsert;
export type UploadChunk       = typeof uploadChunksTable.$inferSelect;
