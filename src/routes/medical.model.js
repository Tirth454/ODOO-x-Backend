import { Router } from "express";
import {
    registerMedical,
    updateVerifyStatus,
    loginMedical
} from "../controllers/medical.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerMedical);
router.post("/verify", updateVerifyStatus);
router.post("/login", loginMedical);

export default router;
