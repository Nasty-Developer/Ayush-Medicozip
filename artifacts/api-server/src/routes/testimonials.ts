/**
 * Testimonials API — replaces Firestore "testimonials" collection.
 *
 * GET    /api/testimonials            → public: enabled testimonials, ordered
 * GET    /api/testimonials/all        → admin: all testimonials (incl. hidden)
 * POST   /api/testimonials            → admin: create
 * PUT    /api/testimonials/:id        → admin: update
 * DELETE /api/testimonials/:id        → admin: delete
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { testimonialsTable, type InsertTestimonial } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(testimonialsTable).where(eq(testimonialsTable.enabled, true)).orderBy(asc(testimonialsTable.order));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "GET /testimonials failed");
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.get("/all", requireAuth, requireAdminEmail, async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.select().from(testimonialsTable).orderBy(asc(testimonialsTable.order));
    res.json(rows);
  } catch (err) {
    logger.error({ err }, "GET /testimonials/all failed");
    res.status(500).json({ error: "Failed to fetch testimonials" });
  }
});

router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as InsertTestimonial;
    if (!body.name?.trim() || !body.content?.trim()) { res.status(400).json({ error: "name and content are required" }); return; }
    const [created] = await db.insert(testimonialsTable).values(body).returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "POST /testimonials failed");
    res.status(500).json({ error: "Failed to create testimonial" });
  }
});

router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(testimonialsTable)
      .set({ ...(req.body as Partial<InsertTestimonial>), updatedAt: new Date() })
      .where(eq(testimonialsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Testimonial not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PUT /testimonials/:id failed");
    res.status(500).json({ error: "Failed to update testimonial" });
  }
});

router.delete("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(testimonialsTable).where(eq(testimonialsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Testimonial not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "DELETE /testimonials/:id failed");
    res.status(500).json({ error: "Failed to delete testimonial" });
  }
});

export default router;
