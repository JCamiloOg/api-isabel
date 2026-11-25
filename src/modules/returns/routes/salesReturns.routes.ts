import { Router } from "express";
import { createSaleReturn, getSales, getSalesReturns, resolveSaleReturn } from "../controllers/salesReturn.controller.js";

const router = Router();


router.get("/", getSalesReturns);
router.post("/", createSaleReturn);


router.get("/sales", getSales);


router.put("/:idSaleReturn", resolveSaleReturn);
router.get("/:idSale", getSalesReturns);


export default router;