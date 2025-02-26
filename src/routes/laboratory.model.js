import { Router } from "express";
import {
    registerLaboratory,
    updateVerifyStatus,
    loginLaboratory,
    getCurrentLaboratory
} from "../controllers/laboratory.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerLaboratory);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(loginLaboratory);
router.route("/current").get(checkAuth, getCurrentLaboratory);

export default router;