import { Router } from "express";
import {
    getCategories,
    getNextCategoryId,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} from "../controllers/categories.Product.controller.js";

const router = Router();

router.get("/", getCategories);
router.post("/", createCategory);
router.get("/next-id", getNextCategoryId);
router.get("/:id", getCategoryById);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
