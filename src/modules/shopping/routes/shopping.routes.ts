import { Router } from "express";
import { getShoppings } from "../controllers/shopping.controller.js";

const router = Router();

router.get("/", getShoppings);
router.get("/:idShopping", getShoppings);
// router.post("/");
// router.put("/:idShopping");
// router.delete("/:idShopping");

export default router;

