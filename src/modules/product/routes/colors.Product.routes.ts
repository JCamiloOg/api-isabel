import { Router } from "express";
import {
    getColors,
    getNextColorId,
    getColorById,
    createColor,
    updateColor,
    deleteColor
} from "../controllers/colors.Product.controller.js";

const router = Router();

router.get("/", getColors);
router.post("/", createColor);
router.get("/next-id", getNextColorId);
router.get("/:id", getColorById);
router.put("/:id", updateColor);
router.delete("/:id", deleteColor);

export default router;
