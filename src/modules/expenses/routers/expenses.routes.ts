import { Router } from "express";
import { createExpenses, deleteExpenses, getExpenses, updateExpenses } from "../controllers/expenses.controller.js";

const router = Router();


router.get("/", getExpenses);
router.get("/:idExpenses", getExpenses);

router.post("/create", createExpenses);

router.put("/:idExpenses", updateExpenses);

router.delete("/:idExpenses", deleteExpenses);

export default router;


