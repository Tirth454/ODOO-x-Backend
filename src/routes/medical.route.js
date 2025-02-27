import { Router } from "express";
import {
    registerMedical,
    updateVerifyStatus,
    loginMedical,
    getCurrentMedical,
    logoutMedical,
    getPrescriptionsByUniqueId
} from "../controllers/medical.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerMedical);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(loginMedical);
router.route("/current").get(checkAuth, getCurrentMedical);
router.route("/logout").post(checkAuth, logoutMedical)
router.route("/getPrescriptionsByUniqueId").get(checkAuth, getPrescriptionsByUniqueId);

export default router;
