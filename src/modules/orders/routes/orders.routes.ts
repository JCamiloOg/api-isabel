import { Router } from "express";
import { getOrders, updateStatusOrder } from "../controllers/orders.controller.js";

const router = Router();


router.get("/", getOrders);


router.get("/:idOrder", getOrders);

router.patch("/status/:idOrder", updateStatusOrder);

export default router;