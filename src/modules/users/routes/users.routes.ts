import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUsers,
  updateUserInfo,
  updateUserStatus,
} from "../controllers/users.controller.js";

const router = Router();

router.get("/", getUsers);
router.post("/", createUser);

router.patch("/status/:identityDocument", updateUserStatus);

router.get("/:identityDocument", getUsers);
router.put("/:identityDocument", updateUserInfo);
router.delete("/:identityDocument", deleteUser);

export default router;