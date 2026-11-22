import { Router } from "express";
import { getPermissions } from "../controllers/permissions.controller.js";

const router = Router();

router.get("/", getPermissions);
router.get("/:idPermission", getPermissions);

export default router;