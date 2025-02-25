import { Router } from "express";
import {
    registerPatient,
    updateVerifyStatus,
    login
} from "../controllers/patient.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerPatient);
router.post("/verify", updateVerifyStatus);
router.post("/login", login);

export default router;
