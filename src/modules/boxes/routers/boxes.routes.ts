import { Router } from "express";
import { createBoxes, deleteBoxes, getBoxes, updateBoxes } from "../controllers/boxes.controllers.js";

const router = Router();


router.get("/", getBoxes);
router.get("/:idBox", getBoxes);

router.post("/create", createBoxes);

router.put("/:idBox", updateBoxes);

router.delete("/:idBox", deleteBoxes);

export default router;


