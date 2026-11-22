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

router.patch("/status/:idUser", updateUserStatus);

router.get("/:idUser", getUsers);
router.put("/:idUser", updateUserInfo);
router.delete("/:idUser", deleteUser);

export default router;