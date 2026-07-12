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

export default router;
