/**
 * FAQs API — replaces Firestore "faqs" collection.
 *
 * GET    /api/faqs             → public: enabled FAQs, ordered
 * GET    /api/faqs/all         → admin: all FAQs (incl. hidden)
 * POST   /api/faqs             → admin: create
 * PUT    /api/faqs/:id         → admin: update
 * DELETE /api/faqs/:id         → admin: delete
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { faqsTable, type InsertFaq } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(faqsTable).where(eq(faqsTable.enabled, true)).orderBy(asc(faqsTable.order));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "GET /faqs failed");
    res.status(500).json({ error: "Failed to fetch faqs" });
  }
});

router.get("/all", requireAuth, requireAdminEmail, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(faqsTable).orderBy(asc(faqsTable.order));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "GET /faqs/all failed");
    res.status(500).json({ error: "Failed to fetch faqs" });
  }
});

router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as InsertFaq;
    if (!body.question?.trim() || !body.answer?.trim()) { res.status(400).json({ error: "question and answer are required" }); return; }
    const [created] = await db.insert(faqsTable).values(body).returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "POST /faqs failed");
    res.status(500).json({ error: "Failed to create faq" });
  }
});

router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(faqsTable)
      .set({ ...(req.body as Partial<InsertFaq>), updatedAt: new Date() })
      .where(eq(faqsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "FAQ not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /faqs/:id failed");
    res.status(500).json({ error: "Failed to update faq" });
  }
});

router.delete("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(faqsTable).where(eq(faqsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "FAQ not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /faqs/:id failed");
    res.status(500).json({ error: "Failed to delete faq" });
  }
});

export default router;
