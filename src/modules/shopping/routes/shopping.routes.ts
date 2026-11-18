import { Router } from "express";
import { getProducts, getShoppings, getSupplier } from "../controllers/shopping.controller.js";

const router = Router();

router.get("/", getShoppings);
router.get("/suppliers", getSupplier);
router.get("/products", getProducts);

router.get("/:idShopping", getShoppings);
// router.post("/");
// router.put("/:idShopping");
// router.delete("/:idShopping");

export default router;

