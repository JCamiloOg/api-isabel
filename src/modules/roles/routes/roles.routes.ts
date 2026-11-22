import { Router } from "express";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
} from "../controllers/roles.controller.js";

const router = Router();

router.get("/", getRoles);
router.post("/", createRole);

router.get("/:idRole", getRoles);
router.put("/:idRole", updateRole);
router.delete("/:idRole", deleteRole);

export default router;