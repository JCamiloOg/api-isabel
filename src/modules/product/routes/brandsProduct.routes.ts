import { Router } from "express";
import {
    getBrands,
    getNextBrandId,
    getBrandById,
    createBrand,
    updateBrand,
    updateBrandStatus,
    deleteBrand
} from "../controllers/brandsProduct.controller.js";

const router = Router();

router.get("/", getBrands);
router.post("/", createBrand);
router.get("/next-id", getNextBrandId);
router.patch("/status/:id", updateBrandStatus);
router.get("/:id", getBrandById);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;
