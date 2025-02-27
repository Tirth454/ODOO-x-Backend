import { Router } from "express";
import {
    registerDoctor,
    updateVerifyStatus,
    loginDoctor,
    getCurrentDoctor,
    logoutDoctor,
    getUnacceptedAppointments,
    updateAppointmentStatus,
    getUpdatedAppointment
} from "../controllers/doctor.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerDoctor);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(loginDoctor);
router.route("/current").get(checkAuth, getCurrentDoctor);
router.route("/logout").post(checkAuth, logoutDoctor)
router.route("/getUnacceptedAppointments").get(checkAuth, getUnacceptedAppointments)
router.route("/updateAppointmentStatus").post(checkAuth, updateAppointmentStatus)
router.route("/getUpdatedAppointment").get(checkAuth, getUpdatedAppointment)

export default router;
