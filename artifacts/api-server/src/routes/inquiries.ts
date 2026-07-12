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
import { inquiriesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";

const router = Router();

// ── POST /api/inquiries ───────────────────────────────────────────────────────
// Public — customer submits an inquiry or medicine request
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const inquiryId = (body.inquiryId as string) || (body.requestId as string);
    if (!inquiryId) { res.status(400).json({ error: "inquiryId is required" }); return; }

    const type = (body.type as string) === "medicine-request" ? "medicine-request" as const : "inquiry" as const;
    const customerName = body.customerName as string;
    const mobileNumber = body.mobileNumber as string;
    if (!customerName || !mobileNumber) {
      res.status(400).json({ error: "customerName and mobileNumber are required" });
      return;
    }

    const [row] = await db.insert(inquiriesTable).values({
      inquiryId,
      type,
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
      source:             (body.source as "website" | "whatsapp" | "email") || "website",
      notes:              (body.notes              as string)  || null,
      status:             "pending",
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
router.patch("/:inquiryId/prescription", async (req: Request, res: Response): Promise<void> => {
  try {
    const { inquiryId } = req.params;
    const { prescriptionUrl, hasPrescription } = req.body as { prescriptionUrl?: string; hasPrescription?: boolean };

    await db.update(inquiriesTable)
      .set({
        ...(prescriptionUrl !== undefined ? { prescriptionUrl } : {}),
        ...(hasPrescription !== undefined ? { hasPrescription: Boolean(hasPrescription) } : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(inquiriesTable.inquiryId, inquiryId));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "PATCH /inquiries/:id/prescription failed");
    res.status(500).json({ error: "Failed to update prescription" });
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
            eq(inquiriesTable.status, "pending"),
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

      const { status, adminNotes, ...extra } = req.body as {
        status?: string;
        adminNotes?: string;
        [key: string]: unknown;
      };

      const updateData: Record<string, unknown> = { updatedAt: sql`now()` };
      if (status     !== undefined) updateData.status     = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      // Allow patching pricing fields for medicine requests
      const ALLOWED_PATCH_FIELDS = [
        "medicinePrice","deliveryCharge","discount","grandTotal","paymentStatus",
        "prescriptionUrl","hasPrescription","medicinePhotoUrl",
      ];
      for (const key of ALLOWED_PATCH_FIELDS) {
        if (key in extra) updateData[key] = extra[key];
      }

      await db.update(inquiriesTable).set(updateData as Parameters<typeof db.update>[0]).where(eq(inquiriesTable.id, id));

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
  async (req: Request, res: Response): Promise<void> => {
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
