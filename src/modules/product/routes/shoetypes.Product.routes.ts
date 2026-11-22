import { Router } from "express";
import {
    getShoeTypes,
    getNextShoeTypeId,
    getShoeTypeById,
    createShoeType,
    updateShoeType,
    deleteShoeType
} from "../controllers/shoetypes.Product.controller.js";

const router = Router();

router.get("/", getShoeTypes);
router.post("/", createShoeType);
router.get("/next-id", getNextShoeTypeId);
router.get("/:id", getShoeTypeById);
router.put("/:id", updateShoeType);
router.delete("/:id", deleteShoeType);

export default router;
