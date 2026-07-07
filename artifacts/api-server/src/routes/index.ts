import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import productsRouter from "./products";
import ordersRouter from "./orders";
import usersRouter from "./users";
import couponsRouter from "./coupons";
import medicinesRouter from "./medicines";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/products", productsRouter);
router.use("/orders", ordersRouter);
router.use("/users", usersRouter);
router.use("/coupons", couponsRouter);
router.use("/medicines", medicinesRouter);

export default router;
