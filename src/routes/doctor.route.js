import { Router } from "express";
import {
    registerDoctor,
    updateVerifyStatus,
    loginDoctor,
    getCurrentDoctor,
    logoutDoctor,
    getUnacceptedAppointments,
    updateAppointmentStatus,
    getUpdatedAppointment,
    getPatientByUniqueId,
    addPrescription,
    updateAttendedStatus,
    addCamp,
    getSuggestions
} from "../controllers/doctor.controller.js";
import checkAuth from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/register").post(registerDoctor);
router.route("/verify").post(updateVerifyStatus);
router.route("/login").post(loginDoctor);
router.route("/current").get(checkAuth, getCurrentDoctor);
router.route("/logout").post(checkAuth, logoutDoctor);
router.route("/getUnacceptedAppointments").get(checkAuth, getUnacceptedAppointments);
router.route("/updateAppointmentStatus").post(checkAuth, updateAppointmentStatus);
router.route("/getUpdatedAppointment").get(checkAuth, getUpdatedAppointment);
router.route("/getPatientByUniqueId").post(checkAuth, getPatientByUniqueId);
router.route("/addPrescription").post(checkAuth, upload.fields([
    {
        name: "PricptionImage",
        maxCount: 2
    }
]), addPrescription);
router.route("/updateAttendedStatus").post(checkAuth, updateAttendedStatus);
router.route("/addCamp").post(checkAuth, addCamp);
router.route("/get-suggestions").get(
    checkAuth,
    getSuggestions
);


export default router;
