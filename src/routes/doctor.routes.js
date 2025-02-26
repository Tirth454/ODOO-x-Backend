import { Router } from "express";
import {
    registerDoctor,
    updateVerifyStatus,
    loginDoctor,
    getCurrentDoctor
} from "../controllers/doctor.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerDoctor);
router.post("/verify", updateVerifyStatus);
router.post("/login", loginDoctor);
router.get("/current", getCurrentDoctor);

export default router;
