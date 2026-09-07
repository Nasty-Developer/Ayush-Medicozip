import { Router } from "express";
import healthRouter from "./health.js";
import medicinesRouter from "./medicines.js";
import categoriesRouter from "./categories.js";
import productsRouter from "./products.js";
import vetMedicinesRouter from "./vet-medicines.js";
import generalProductsRouter from "./general-products.js";
import ordersRouter from "./orders.js";
import usersRouter from "./users.js";
import couponsRouter from "./coupons.js";
import syncRouter from "./sync.js";
import adminRouter from "./admin.js";
import inquiriesRouter from "./inquiries.js";
import addressesRouter from "./addresses.js";
import testimonialsRouter from "./testimonials.js";
import faqsRouter from "./faqs.js";
import notificationsRouter from "./notifications.js";
import settingsRouter from "./settings.js";
import paymentRouter from "./payment.js";
import porterRouter from "./porter.js";

const router = Router();

router.use(healthRouter);

// ── Public medicine catalogue (PostgreSQL) ────────────────────────────────────
// Mounts at root so we get /api/medicines, /api/categories, /api/search, etc.
router.use("/", medicinesRouter);

// ── Additional product collections ───────────────────────────────────────────
router.use("/vet-medicines",    vetMedicinesRouter);
router.use("/general-products", generalProductsRouter);

// ── Admin CRUD ────────────────────────────────────────────────────────────────
router.use("/admin/categories", categoriesRouter); // moved to /admin/ to avoid conflict
router.use("/admin",     adminRouter);    // stats, companies, drug-groups, medicines
router.use("/products",  productsRouter);
router.use("/orders",    ordersRouter);
router.use("/users",     usersRouter);
router.use("/coupons",   couponsRouter);
router.use("/sync",      syncRouter);
router.use("/inquiries", inquiriesRouter);
router.use("/addresses", addressesRouter);
router.use("/testimonials", testimonialsRouter);
router.use("/faqs",      faqsRouter);
router.use("/notifications", notificationsRouter);
router.use("/settings",     settingsRouter);
router.use("/payment",      paymentRouter);
router.use("/porter",       porterRouter);

export default router;
