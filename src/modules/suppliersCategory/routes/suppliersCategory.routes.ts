import { Router } from "express";
import { createSupplierCategory, deleteSupplierCategory, getSuppliersCategory, updateSupplierCategory } from "../controllers/suppliersCategory.controller.js";

const router = Router();


router.get("/", getSuppliersCategory);
router.get("/:idSupplierCategory", getSuppliersCategory);

router.post("/", createSupplierCategory);

router.put("/:idSupplierCategory", updateSupplierCategory);

router.delete("/:idSupplierCategory", deleteSupplierCategory);

export default router;
