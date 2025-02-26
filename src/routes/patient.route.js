import { Router } from "express";
import {
    registerPatient,
    updateVerifyStatus,
    patientLogin,
    getCurrentPatient
} from "../controllers/patient.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/register", registerPatient);
router.post("/verify", updateVerifyStatus);
router.post("/login", patientLogin);
router.get("/current", getCurrentPatient);

export default router;
