import { Router } from "express";
import { addVariantShopping, changePaymentsInfo, createShopping, deletePaymentInfo, deleteVariantInShopping, getProducts, getShoppings, getSupplier, updatePurchaseStatus, updateShoppingInfo, updateVariantInShopping } from "../controllers/shopping.controller.js";

const router = Router();

router.get("/", getShoppings);
router.post("/", createShopping);

router.get("/suppliers", getSupplier);
router.get("/products", getProducts);

router.patch("/status/:idShopping", updatePurchaseStatus);
router.post("/add-variant/:idShopping", addVariantShopping);
router.put("/payment-info/:idShopping", changePaymentsInfo);
router.delete("/delete-payment/:id", deletePaymentInfo);
router.put("/update-variant/:idShopping/:idVariantShopping", updateVariantInShopping);
router.delete("/delete-variant/:idShopping/:idVariantShopping", deleteVariantInShopping);


router.get("/:idShopping", getShoppings);
router.put("/:idShopping", updateShoppingInfo);

// router.delete("/:idShopping");

export default router;

