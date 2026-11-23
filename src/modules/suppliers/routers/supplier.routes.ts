import { Router } from "express";
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from "../controllers/suppliers.controllers.js";

const router = Router();


router.get("/", getSuppliers);
router.get("/:idSupplier", getSuppliers);

router.post("/create", createSupplier);

router.put("/:idSupplier", updateSupplier);

router.delete("/:idSupplier", deleteSupplier);

export default router;

