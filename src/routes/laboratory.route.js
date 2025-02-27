import { Router } from "express";
import {
    registerLaboratory,
    updateVerifyStatus,
    loginLaboratory,
    getCurrentLaboratory,
    logoutLaboratory,
    getReportsByUniqueId,
    addReport,
    getPrescriptionsByUniqueId
} from "../controllers/laboratory.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerLaboratory);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(loginLaboratory);
router.route("/current").get(checkAuth, getCurrentLaboratory);
router.route("/logout").post(checkAuth, logoutLaboratory)
router.route("/getReportsByUniqueId").post(checkAuth, getReportsByUniqueId);
router.route("/addReport").post(checkAuth, addReport);
router.route("/getPrescriptionsByUniqueId").post(checkAuth, getPrescriptionsByUniqueId);

export default router;