import { Router } from "express";
import {
    getClients,
    getClientById,
    createClient,
    updateClient,
    deleteClient
} from "../controllers/client.controller.js";

const router = Router();

router.get("/", getClients);
router.post("/", createClient);

router.get("/:identityDocument", getClientById);
router.put("/:identityDocument", updateClient);
router.delete("/:identityDocument", deleteClient);

export default router;
