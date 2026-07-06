import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { couponsTable, type InsertCoupon } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../lib/authMiddleware";

const router = Router();

// Admin: list coupons
router.get("/", requireAuth, requireAdminEmail, async (_req: Request, res: Response): Promise<void> => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(couponsTable.createdAt);
    res.json(coupons);
  } catch (err) {
    logger.error({ err }, "Failed to fetch coupons");
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// Customer: validate a coupon before checkout — auth required, orderAmount required
router.post("/validate", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, orderAmount } = req.body as { code?: string; orderAmount?: number };
    if (!code) { res.status(400).json({ error: "code is required" }); return; }
    if (orderAmount == null || typeof orderAmount !== "number" || orderAmount < 0) {
      res.status(400).json({ error: "orderAmount (number ≥ 0) is required" }); return;
    }

    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, String(code).toUpperCase()));
    if (!coupon) { res.status(404).json({ error: "Invalid coupon code" }); return; }
    if (!coupon.isActive) { res.status(400).json({ error: "Coupon is no longer active" }); return; }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      res.status(400).json({ error: "Coupon usage limit reached" }); return;
    }

    const now = new Date();
    if (coupon.validFrom && new Date(coupon.validFrom) > now) {
      res.status(400).json({ error: "Coupon is not yet valid" }); return;
    }
    if (coupon.validUntil && new Date(coupon.validUntil) < now) {
      res.status(400).json({ error: "Coupon has expired" }); return;
    }

    const minOrder = Number(coupon.minimumOrderAmount);
    if (orderAmount < minOrder) {
      res.status(400).json({ error: `Minimum order amount is ₹${minOrder}` }); return;
    }

    let discountAmount: number;
    if (coupon.discountType === "flat") {
      discountAmount = Number(coupon.discountValue);
    } else {
      discountAmount = (orderAmount * Number(coupon.discountValue)) / 100;
      if (coupon.maximumDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maximumDiscount));
    }

    res.json({ valid: true, coupon, discountAmount: Math.min(discountAmount, orderAmount) });
  } catch (err) {
    logger.error({ err }, "Failed to validate coupon");
    res.status(500).json({ error: "Failed to validate coupon" });
  }
});

// Admin-only writes
router.post("/", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const data = req.body as InsertCoupon;
    if (!data.code || !data.discountType || data.discountValue == null) {
      res.status(400).json({ error: "code, discountType, and discountValue are required" }); return;
    }
    const [created] = await db
      .insert(couponsTable)
      .values({ ...data, code: data.code.toUpperCase() })
      .returning();
    res.status(201).json(created);
  } catch (err) {
    logger.error({ err }, "Failed to create coupon");
    res.status(500).json({ error: "Failed to create coupon" });
  }
});

router.put("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [updated] = await db
      .update(couponsTable)
      .set({ ...(req.body as Partial<InsertCoupon>), updatedAt: new Date() })
      .where(eq(couponsTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "Failed to update coupon");
    res.status(500).json({ error: "Failed to update coupon" });
  }
});

router.delete("/:id", requireAuth, requireAdminEmail, async (req: Request, res: Response): Promise<void> => {
  try {
    const id = Number(req.params["id"]);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [deleted] = await db.delete(couponsTable).where(eq(couponsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Coupon not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete coupon");
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

export default router;
