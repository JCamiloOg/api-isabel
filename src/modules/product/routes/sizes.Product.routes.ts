import { Router } from "express";
import {
    getSizes,
    getNextSizeId,
    getSizeById,
    createSize,
    updateSize,
    deleteSize
} from "../controllers/sizes.Product.controller.js";

const router = Router();

router.get("/", getSizes);
router.post("/", createSize);
router.get("/next-id", getNextSizeId);
router.get("/:id", getSizeById);
router.put("/:id", updateSize);
router.delete("/:id", deleteSize);

export default router;
