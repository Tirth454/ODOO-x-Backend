import { Router } from "express";
import {
    registerPatient,
    updateVerifyStatus,
    patientLogin,
    getCurrentPatient,
    logoutPatient
} from "../controllers/patient.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerPatient);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(patientLogin);
router.route("/current").get(checkAuth, getCurrentPatient);
router.route("/logout").post(checkAuth, logoutPatient)

export default router;
