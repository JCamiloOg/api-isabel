import { Router } from "express";
import {
  addSalePayment,
  createSale,
  getCustomersForSale,
  getProductsForSale,
  getSales,
  updateSaleStatus,
} from "../controllers/sales.controller.js";

const router = Router();

router.get("/", getSales);
router.post("/", createSale);

router.get("/customers", getCustomersForSale);
router.get("/products", getProductsForSale);

router.patch("/status/:idSale", updateSaleStatus);
router.post("/payment/:idSale", addSalePayment);

router.get("/:idSale", getSales);

export default router;