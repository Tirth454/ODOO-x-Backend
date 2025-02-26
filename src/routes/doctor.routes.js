import { Router } from "express";
import {
    registerDoctor,
    updateVerifyStatus,
    loginDoctor
} from "../controllers/doctor.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerDoctor);
router.post("/verify", updateVerifyStatus);
router.post("/login", loginDoctor);

export default router;
