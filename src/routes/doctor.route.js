import { Router } from "express";
import {
    registerDoctor,
    updateVerifyStatus,
    loginDoctor,
    getCurrentDoctor,
    logoutDoctor
} from "../controllers/doctor.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerDoctor);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(loginDoctor);
router.route("/current").get(checkAuth, getCurrentDoctor);
router.route("/logout").post(checkAuth, logoutDoctor)

export default router;
