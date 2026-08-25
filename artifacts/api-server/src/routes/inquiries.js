/**
 * Inquiries API — replaces Firestore "inquiries" collection.
 *
 * POST /api/inquiries             → customer submits inquiry or medicine request
 * GET  /api/inquiries             → admin: list all (auth required)
 * GET  /api/inquiries/counts      → admin: badge counts (new inquiries + pending requests)
 * PATCH /api/inquiries/:id/status → admin: update status
 * DELETE /api/inquiries/:id       → admin: delete
 */
import { Router } from "express";
import { eq, desc, and, or, count, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { inquiriesTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAuth, requireAdminEmail } from "../middlewares/authMiddleware";
const router = Router();
// ── POST /api/inquiries ───────────────────────────────────────────────────────
// Public — customer submits an inquiry or medicine request
router.post("/", async (req, res) => {
    try {
        const body = req.body;
        const inquiryId = body.inquiryId || body.requestId;
        if (!inquiryId) {
            res.status(400).json({ error: "inquiryId is required" });
            return;
        }
        const type = body.type === "medicine-request" ? "medicine-request" : "inquiry";
        const customerName = body.customerName;
        const mobileNumber = body.mobileNumber;
        if (!customerName || !mobileNumber) {
            res.status(400).json({ error: "customerName and mobileNumber are required" });
            return;
        }
        const [row] = await db.insert(inquiriesTable).values({
            inquiryId,
            type,
            customerName,
            mobileNumber,
            whatsappNumber: body.whatsappNumber || null,
            email: body.email || null,
            subject: body.subject || null,
            message: body.message || null,
            preferredContact: body.preferredContact || null,
            medicineName: body.medicineName || null,
            medicineStrength: body.medicineStrength || null,
            medicineBrand: body.medicineBrand || null,
            quantity: body.quantity || null,
            houseNumber: body.houseNumber || null,
            street: body.street || null,
            landmark: body.landmark || null,
            pincode: body.pincode || null,
            fullAddress: body.fullAddress || null,
            deliveryInstructions: body.deliveryInstructions || null,
            deliveryEligible: body.deliveryEligible ?? null,
            prescriptionUrl: body.prescriptionUrl || null,
            hasPrescription: Boolean(body.hasPrescription),
            medicinePhotoUrl: body.medicinePhotoUrl || null,
            source: body.source || "website",
            notes: body.notes || null,
            status: "new",
            updatedAt: new Date(),
        }).returning();
        logger.info({ id: row.id, type, inquiryId }, "Inquiry saved to PostgreSQL");
        res.status(201).json({ success: true, id: row.id, inquiryId });
    }
    catch (err) {
        logger.error({ err }, "POST /inquiries failed");
        res.status(500).json({ error: "Failed to save inquiry" });
    }
});
// ── PATCH /api/inquiries/:id/prescription ─────────────────────────────────────
// Customer updates prescription URL after upload (non-auth, keyed by inquiryId)
router.patch("/:inquiryId/prescription", async (req, res) => {
    try {
        const { inquiryId } = req.params;
        const { prescriptionUrl, hasPrescription } = req.body;
        await db.update(inquiriesTable)
            .set({
            ...(prescriptionUrl !== undefined ? { prescriptionUrl } : {}),
            ...(hasPrescription !== undefined ? { hasPrescription: Boolean(hasPrescription) } : {}),
            updatedAt: sql `now()`,
        })
            .where(eq(inquiriesTable.inquiryId, inquiryId));
        res.json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "PATCH /inquiries/:id/prescription failed");
        res.status(500).json({ error: "Failed to update prescription" });
    }
});
// ── GET /api/inquiries/lookup ─────────────────────────────────────────────────
// Public — order tracking page. Requires BOTH inquiryId and mobile number to
// match the same record; never reveals which of the two was wrong (generic
// 404 on any mismatch) to prevent enumeration of order data.
router.get("/lookup", async (req, res) => {
    try {
        const inquiryId = String(req.query.inquiryId ?? "").trim().toUpperCase();
        const mobile = String(req.query.mobile ?? "").trim().replace(/\D/g, "").slice(-10);
        if (!inquiryId || !mobile) {
            res.status(400).json({ error: "inquiryId and mobile are required" });
            return;
        }
        const [row] = await db.select().from(inquiriesTable).where(eq(inquiriesTable.inquiryId, inquiryId));
        if (!row) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        const storedDigits = (row.mobileNumber || "").replace(/\D/g, "").slice(-10);
        if (!storedDigits || storedDigits !== mobile) {
            res.status(404).json({ error: "Order not found" });
            return;
        }
        res.json(row);
    }
    catch (err) {
        logger.error({ err }, "GET /inquiries/lookup failed");
        res.status(500).json({ error: "Order not found" });
    }
});
// ── GET /api/inquiries/counts ─────────────────────────────────────────────────
// Admin: badge counts for sidebar
router.get("/counts", requireAuth, requireAdminEmail, async (_req, res) => {
    try {
        const [newInquiriesRow] = await db
            .select({ cnt: count() })
            .from(inquiriesTable)
            .where(and(eq(inquiriesTable.type, "inquiry"), or(eq(inquiriesTable.status, "pending"), eq(inquiriesTable.status, "new"))));
        const [pendingRequestsRow] = await db
            .select({ cnt: count() })
            .from(inquiriesTable)
            .where(and(eq(inquiriesTable.type, "medicine-request"), eq(inquiriesTable.status, "pending")));
        res.json({
            newInquiries: newInquiriesRow?.cnt ?? 0,
            pendingRequests: pendingRequestsRow?.cnt ?? 0,
        });
    }
    catch (err) {
        logger.error({ err }, "GET /inquiries/counts failed");
        res.status(500).json({ error: "Failed to fetch counts" });
    }
});
// ── GET /api/inquiries ────────────────────────────────────────────────────────
// Admin: list inquiries (optionally filter by type)
router.get("/", requireAuth, requireAdminEmail, async (req, res) => {
    try {
        const type = req.query.type;
        const limit = Math.min(Number(req.query.limit ?? 200), 500);
        const offset = Number(req.query.offset ?? 0);
        const rows = await db
            .select()
            .from(inquiriesTable)
            .where(type ? eq(inquiriesTable.type, type) : undefined)
            .orderBy(desc(inquiriesTable.createdAt))
            .limit(limit)
            .offset(offset);
        res.json({ data: rows, total: rows.length, limit, offset });
    }
    catch (err) {
        logger.error({ err }, "GET /inquiries failed");
        res.status(500).json({ error: "Failed to fetch inquiries" });
    }
});
// ── PATCH /api/inquiries/:id/status ──────────────────────────────────────────
// Admin: update status / admin notes
router.patch("/:id/status", requireAuth, requireAdminEmail, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid id" });
            return;
        }
        const { status, adminNotes, ...extra } = req.body;
        // Build a typed Drizzle update object using only columns that exist in the schema.
        // Note: medicinePrice / deliveryCharge / discount / grandTotal / paymentStatus were
        // previously listed in ALLOWED_PATCH_FIELDS but are not columns in inquiriesTable;
        // Drizzle silently ignores unknown keys, so removing them has no runtime effect.
        const updateFields = { updatedAt: new Date() };
        if (status !== undefined)
            updateFields.status = status;
        if (adminNotes !== undefined)
            updateFields.adminNotes = adminNotes;
        if ("prescriptionUrl" in extra)
            updateFields.prescriptionUrl = extra.prescriptionUrl;
        if ("hasPrescription" in extra)
            updateFields.hasPrescription = Boolean(extra.hasPrescription);
        if ("medicinePhotoUrl" in extra)
            updateFields.medicinePhotoUrl = extra.medicinePhotoUrl;
        await db.update(inquiriesTable).set(updateFields).where(eq(inquiriesTable.id, id));
        res.json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "PATCH /inquiries/:id/status failed");
        res.status(500).json({ error: "Failed to update inquiry" });
    }
});
// ── DELETE /api/inquiries/:id ─────────────────────────────────────────────────
router.delete("/:id", requireAuth, requireAdminEmail, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            res.status(400).json({ error: "Invalid id" });
            return;
        }
        await db.delete(inquiriesTable).where(eq(inquiriesTable.id, id));
        res.json({ success: true });
    }
    catch (err) {
        logger.error({ err }, "DELETE /inquiries/:id failed");
        res.status(500).json({ error: "Failed to delete inquiry" });
    }
});
export default router;
