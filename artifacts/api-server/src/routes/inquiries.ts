/**
 * Inquiries API — replaces Firestore "inquiries" collection.
 *
 * POST /api/inquiries             → customer submits inquiry or medicine request
 * GET  /api/inquiries             → admin: list all (auth required)
 * GET  /api/inquiries/counts      → admin: badge counts (new inquiries + pending requests)
 * PATCH /api/inquiries/:id/status → admin: update status
 * DELETE /api/inquiries/:id       → admin: delete
 */

import { Router, type Request, type Response } from "express";
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { inquiriesTable, type InsertInquiry } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { requireAuth, requireAdminEmail, isAdminEmail, type AuthenticatedRequest } from "../middlewares/authMiddleware.js";

const router = Router();

function optionalAuth(req: AuthenticatedRequest, res: Response, next: () => void): void {
  if (!req.headers.authorization) { next(); return; }
  void requireAuth(req, res, next);
}

// ── POST /api/inquiries ───────────────────────────────────────────────────────
// Public — customer submits an inquiry or medicine request
router.post("/", optionalAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const inquiryId = (body.inquiryId as string) || (body.requestId as string);
    if (!inquiryId) { res.status(400).json({ error: "inquiryId is required" }); return; }

    if (body.type !== "inquiry" && body.type !== "medicine-request") { res.status(400).json({ error: "Invalid inquiry type" }); return; }
    const type = body.type;
    const customerName = typeof body.customerName === "string" ? body.customerName.trim() : "";
    const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";
    if (!customerName || !mobileNumber) {
      res.status(400).json({ error: "customerName and mobileNumber are required" });
      return;
    }
    if (body.source !== undefined && !["website", "whatsapp", "email"].includes(String(body.source))) {
      res.status(400).json({ error: "Invalid inquiry source" }); return;
    }
    if (body.status !== undefined || body.paymentStatus !== undefined) {
      res.status(400).json({ error: "Status fields are controlled by the server" }); return;
    }

    const [row] = await db.insert(inquiriesTable).values({
      inquiryId,
      type,
      customerId: req.firebaseUser?.uid ?? null,
      customerName,
      mobileNumber,
      whatsappNumber:     (body.whatsappNumber     as string)  || null,
      email:              (body.email              as string)  || null,
      subject:            (body.subject            as string)  || null,
      message:            (body.message            as string)  || null,
      preferredContact:   (body.preferredContact   as "phone" | "whatsapp" | "email" | undefined) || null,
      medicineName:       (body.medicineName       as string)  || null,
      medicineStrength:   (body.medicineStrength   as string)  || null,
      medicineBrand:      (body.medicineBrand      as string)  || null,
      quantity:           (body.quantity           as string)  || null,
      houseNumber:        (body.houseNumber        as string)  || null,
      street:             (body.street             as string)  || null,
      landmark:           (body.landmark           as string)  || null,
      pincode:            (body.pincode            as string)  || null,
      fullAddress:        (body.fullAddress        as string)  || null,
      deliveryInstructions:(body.deliveryInstructions as string) || null,
      deliveryEligible:   (body.deliveryEligible   as boolean) ?? null,
      prescriptionUrl:    (body.prescriptionUrl    as string)  || null,
      hasPrescription:    Boolean(body.hasPrescription),
      medicinePhotoUrl:   (body.medicinePhotoUrl   as string)  || null,
      medicinePrice:      body.medicinePrice != null ? String(body.medicinePrice) : null,
      deliveryCharge:     body.deliveryCharge != null ? String(body.deliveryCharge) : null,
      discount:           body.discount != null ? String(body.discount) : null,
      grandTotal:         body.grandTotal != null ? String(body.grandTotal) : null,
      source:             (body.source as "website" | "whatsapp" | "email") || "website",
      notes:              (body.notes              as string)  || null,
      status:             "new",
      updatedAt:          new Date(),
    }).returning();

    logger.info({ id: row!.id, type, inquiryId }, "Inquiry saved to PostgreSQL");
    res.status(201).json({ success: true, id: row!.id, inquiryId });
  } catch (err) {
    logger.error({ err }, "POST /inquiries failed");
    res.status(500).json({ error: "Failed to save inquiry" });
  }
});

// ── PATCH /api/inquiries/:id/prescription ─────────────────────────────────────
// Customer updates prescription URL after upload (non-auth, keyed by inquiryId)
router.patch("/:inquiryId/prescription", requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { inquiryId } = req.params;
    const { prescriptionUrl, hasPrescription, medicinePhotoUrl } = req.body as {
      prescriptionUrl?: string;
      hasPrescription?: boolean;
      medicinePhotoUrl?: string;
    };
    if ((prescriptionUrl !== undefined && typeof prescriptionUrl !== "string") ||
      (medicinePhotoUrl !== undefined && typeof medicinePhotoUrl !== "string") ||
      (hasPrescription !== undefined && typeof hasPrescription !== "boolean")) {
      res.status(400).json({ error: "Invalid prescription fields" }); return;
    }
    const [existing] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.inquiryId, inquiryId));
    if (!existing) { res.status(404).json({ error: "Inquiry not found" }); return; }
    if (existing.customerId !== req.firebaseUser?.uid && !isAdminEmail(req.firebaseUser?.email)) {
      res.status(403).json({ error: "Forbidden" }); return;
    }

    await db.update(inquiriesTable)
      .set({
        ...(prescriptionUrl !== undefined ? { prescriptionUrl } : {}),
        ...(hasPrescription !== undefined ? { hasPrescription: Boolean(hasPrescription) } : {}),
        ...(medicinePhotoUrl !== undefined ? { medicinePhotoUrl } : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(inquiriesTable.inquiryId, inquiryId));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "PATCH /inquiries/:id/prescription failed");
    res.status(500).json({ error: "Failed to update prescription" });
  }
});

// ── GET /api/inquiries/lookup ─────────────────────────────────────────────────
// Public — order tracking page. Requires BOTH inquiryId and mobile number to
// match the same record; never reveals which of the two was wrong (generic
// 404 on any mismatch) to prevent enumeration of order data.
router.get("/lookup", async (req: Request, res: Response): Promise<void> => {
  try {
    const inquiryId = String(req.query.inquiryId ?? "").trim().toUpperCase();
    const mobile = String(req.query.mobile ?? "").trim().replace(/\D/g, "").slice(-10);
    if (!inquiryId || !mobile) {
      res.status(400).json({ error: "inquiryId and mobile are required" });
      return;
    }

    const [row] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.inquiryId, inquiryId));
    if (!row) { res.status(404).json({ error: "Order not found" }); return; }

    const storedDigits = (row.mobileNumber || "").replace(/\D/g, "").slice(-10);
    if (!storedDigits || storedDigits !== mobile) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json({ inquiryId: row.inquiryId, status: row.status, type: row.type, updatedAt: row.updatedAt });
  } catch (err) {
    logger.error({ err }, "GET /inquiries/lookup failed");
    res.status(500).json({ error: "Order not found" });
  }
});

// ── GET /api/inquiries/counts ─────────────────────────────────────────────────
// Admin: badge counts for sidebar
router.get(
  "/counts",
  requireAuth,
  requireAdminEmail,
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const [newInquiriesRow] = await db
        .select({ cnt: count() })
        .from(inquiriesTable)
        .where(
          and(
            eq(inquiriesTable.type, "inquiry"),
            or(
              eq(inquiriesTable.status, "pending"),
              eq(inquiriesTable.status, "new"),
            )!
          )
        );

      const [pendingRequestsRow] = await db
        .select({ cnt: count() })
        .from(inquiriesTable)
        .where(
          and(
            eq(inquiriesTable.type, "medicine-request"),
            or(
              eq(inquiriesTable.status, "pending"),
              eq(inquiriesTable.status, "new"),
              eq(inquiriesTable.status, "pending-verification"),
            )!,
          )
        );

      res.json({
        newInquiries:     newInquiriesRow?.cnt ?? 0,
        pendingRequests:  pendingRequestsRow?.cnt ?? 0,
      });
    } catch (err) {
      logger.error({ err }, "GET /inquiries/counts failed");
      res.status(500).json({ error: "Failed to fetch counts" });
    }
  }
);

// ── GET /api/inquiries ────────────────────────────────────────────────────────
// Admin: list inquiries (optionally filter by type)
router.get(
  "/",
  requireAuth,
  requireAdminEmail,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const type = req.query.type as string | undefined;
      const limit = Math.min(Number(req.query.limit ?? 200), 500);
      const offset = Number(req.query.offset ?? 0);

      const rows = await db
        .select()
        .from(inquiriesTable)
        .where(type ? eq(inquiriesTable.type, type as "inquiry" | "medicine-request") : undefined)
        .orderBy(desc(inquiriesTable.createdAt))
        .limit(limit)
        .offset(offset);

      res.json({ data: rows, total: rows.length, limit, offset });
    } catch (err) {
      logger.error({ err }, "GET /inquiries failed");
      res.status(500).json({ error: "Failed to fetch inquiries" });
    }
  }
);

// ── PATCH /api/inquiries/:id/status ──────────────────────────────────────────
// Admin: update status / admin notes
router.patch(
  "/:id/status",
  requireAuth,
  requireAdminEmail,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

      const { status, adminNotes, ...extra } = req.body as {
        status?: string;
        adminNotes?: string;
        [key: string]: unknown;
      };

      // Build a typed Drizzle update object using only columns that exist in the schema.
      // Note: medicinePrice / deliveryCharge / discount / grandTotal / paymentStatus were
      // previously listed in ALLOWED_PATCH_FIELDS but are not columns in inquiriesTable;
      // Drizzle silently ignores unknown keys, so removing them has no runtime effect.
      const updateFields: Partial<InsertInquiry> = { updatedAt: new Date() };
      if (status     !== undefined) updateFields.status     = status;
      if (adminNotes !== undefined) updateFields.adminNotes = adminNotes;
      if ("prescriptionUrl"  in extra) updateFields.prescriptionUrl  = extra.prescriptionUrl  as string | null;
      if ("hasPrescription"  in extra) updateFields.hasPrescription  = Boolean(extra.hasPrescription);
      if ("medicinePhotoUrl" in extra) updateFields.medicinePhotoUrl = extra.medicinePhotoUrl as string | null;
       if ("medicinePrice" in extra) updateFields.medicinePrice = extra.medicinePrice == null ? null : String(extra.medicinePrice);
       if ("deliveryCharge" in extra) updateFields.deliveryCharge = extra.deliveryCharge == null ? null : String(extra.deliveryCharge);
       if ("discount" in extra) updateFields.discount = extra.discount == null ? null : String(extra.discount);
       if ("grandTotal" in extra) updateFields.grandTotal = extra.grandTotal == null ? null : String(extra.grandTotal);
       if ("paymentStatus" in extra) updateFields.paymentStatus = extra.paymentStatus == null ? null : String(extra.paymentStatus);

      await db.update(inquiriesTable).set(updateFields).where(eq(inquiriesTable.id, id));

      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "PATCH /inquiries/:id/status failed");
      res.status(500).json({ error: "Failed to update inquiry" });
    }
  }
);

// ── DELETE /api/inquiries/:id ─────────────────────────────────────────────────
router.delete(
  "/:id",
  requireAuth,
  requireAdminEmail,
  async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
      await db.delete(inquiriesTable).where(eq(inquiriesTable.id, id));
      res.json({ success: true });
    } catch (err) {
      logger.error({ err }, "DELETE /inquiries/:id failed");
      res.status(500).json({ error: "Failed to delete inquiry" });
    }
  }
);

export default router;
