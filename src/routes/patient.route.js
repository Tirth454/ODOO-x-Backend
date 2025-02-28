import { Router } from "express";
import {
    registerPatient,
    updateVerifyStatus,
    patientLogin,
    getCurrentPatient,
    logoutPatient,
    getAllReports,
    bookAppiontment,
    getAllPrescriptions,
    getAllDoctor,
    getBookedAppointment
} from "../controllers/patient.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerPatient);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(patientLogin);
router.route("/current").get(checkAuth, getCurrentPatient);
router.route("/logout").post(checkAuth, logoutPatient)
router.route("/getAllDoctor").get(checkAuth, getAllDoctor)
router.route("/getAllReports").get(checkAuth, getAllReports)
router.route("/getAllPrescriptions").get(checkAuth, getAllPrescriptions)
router.route("/bookAppiontment").post(checkAuth, bookAppiontment)
router.route("/getBookedAppointment").get(checkAuth,getBookedAppointment)


export default router;
