import { Router, type IRouter } from "express";
import healthRouter   from "./health";
import medicinesRouter from "./medicines";   // handles /medicines/*, /categories, /category/:slug, /search, /featured, /new-arrivals, /special
import categoriesRouter from "./categories"; // admin CRUD for categories
import productsRouter  from "./products";
import ordersRouter    from "./orders";
import usersRouter     from "./users";
import couponsRouter   from "./coupons";
import syncRouter      from "./sync";
import adminRouter     from "./admin";       // admin stats, companies, drug-groups, medicines CRUD
import inquiriesRouter from "./inquiries";   // /api/inquiries — replaces Firestore "inquiries" collection
import addressesRouter from "./addresses";   // /api/addresses — replaces Firestore userAddresses subcollection
import testimonialsRouter from "./testimonials"; // /api/testimonials — replaces Firestore "testimonials" collection
import faqsRouter      from "./faqs";        // /api/faqs — replaces Firestore "faqs" collection
import notificationsRouter from "./notifications"; // /api/notifications — order event log + WhatsApp dispatch
import settingsRouter from "./settings";           // /api/settings — site-wide key/value config (replaces Firestore "settings" collection)
import paymentRouter from "./payment";             // /api/payment  — Razorpay create/verify/failure/send-request (TEST MODE)

const router: IRouter = Router();

router.use(healthRouter);

// ── Public medicine catalogue (PostgreSQL) ────────────────────────────────────
// Mounts at root so we get /api/medicines, /api/categories, /api/search, etc.
router.use("/", medicinesRouter);

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

export default router;
