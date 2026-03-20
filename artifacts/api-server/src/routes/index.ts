import { Router, type IRouter } from "express";
import healthRouter from "./health";
import scanRouter from "./scan";
import ratingsRouter from "./ratings";
import rapidapiRouter from "./rapidapi";
import aiRouter from "./ai";
import searchRouter from "./search";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(scanRouter);
router.use(ratingsRouter);
router.use(rapidapiRouter);
router.use(aiRouter);
router.use(searchRouter);
router.use(stripeRouter);

export default router;
