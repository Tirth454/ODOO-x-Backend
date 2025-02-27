import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiResponse from "../utils/apiResponse.js";
import Doctor from "../models/doctor.model.js";
import Appointment from "../models/appointment.model.js";
import Prescription from "../models/presciption.model.js";
import Patient from "../models/patient.model.js";
import imagekit from "../utils/ImageKit.js"
import fs from 'fs'
import nodeMailer from "nodemailer";


const generateAccessAndRefreshToken = async (doctorId) => {
    try {
        const doctor = await Doctor.findById(doctorId);
        const accessToken = doctor.generateAccessToken();
        const refreshToken = doctor.generateRefreshToken();

        doctor.refreshToken = refreshToken;
        await doctor.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new apiError(500, "Error generating tokens");
    }
};

const generateotp = () => {
    const characters = '0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        otp += characters[randomIndex];
    }
    return otp;
}

const registerDoctor = asyncHandler(async (req, res) => {
    const {
        name,
        age,
        gender,
        email,
        password,
        phoneNumber,
        address,
        specialization,
        qualification,
        experience,
        licenseNumber
    } = req.body;

    // Validate required fields
    if (!name || !age || !gender || !email || !password || !phoneNumber ||
        !address || !specialization || !qualification || !experience || !licenseNumber) {
        return res.status(400).json(new apiError(400, {}, "All fields are required"));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json(new apiError(400, {}, "Invalid email format"));
    }

    // Validate age
    if (age <= 0) {
        return res.status(400).json(new apiError(400, {}, "Age must be a positive number"));
    }

    // Validate gender
    const validGenders = ['Male', 'Female', 'Other'];
    if (!validGenders.includes(gender)) {
        return res.status(400).json(new apiError(400, {}, "Gender must be Male, Female, or Other"));
    }

    // Validate experience
    if (experience < 0) {
        return res.status(400).json(new apiError(400, {}, "Experience cannot be negative"));
    }

    // Check if doctor already exists with the given email
    const existingDoctor = await Doctor.findOne({ email });

    if (existingDoctor) {
        return res.status(400).json(new apiError(400, {}, "Doctor already registered with this email"));
    }

    // Generate OTP
    const otp = generateotp();

    // Create doctor
    const doctor = await Doctor.create({
        name,
        age,
        gender,
        email,
        password,
        phoneNumber,
        address,
        specialization,
        qualification,
        experience,
        licenseNumber,
        isVerified: false,
        otp
    });

    // Send verification email with OTP
    const transporter = nodeMailer.createTransport({
        service: "gmail",
        auth: {
            user: "yellow06jacket@gmail.com",
            pass: "utnk wfpt hlfq hqae",
        },
    });

    const info = await transporter.sendMail({
        from: '"HealthCare Portal" <healthcare@portal.com>',
        to: email,
        subject: "Doctor Registration - OTP Verification",
        text: `Dear Dr. ${name},

Welcome to our Healthcare Portal!

Your OTP for account verification is: ${otp}

Please use this OTP to verify your account. The OTP is valid for a limited time.

For security reasons, please do not share your OTP or login credentials with anyone.

Best Regards,
Healthcare Portal Team`,

        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Welcome to Healthcare Portal</h2>
            
            <p>Dear Dr. ${name},</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333;">Your OTP for Account Verification:</h3>
                <p style="font-size: 24px; color: #0066cc; text-align: center; letter-spacing: 5px;">${otp}</p>
            </div>
            
            <p><strong>Important:</strong> Please use this OTP to verify your account. The OTP is valid for a limited time.</p>
            
            <p style="color: #666;">For security reasons, please do not share your OTP or login credentials with anyone.</p>
            
            <div style="margin-top: 30px;">
                <p>Best Regards,</p>
                <p><strong style="color: #0066cc;">Healthcare Portal Team</strong></p>
            </div>
            
            <hr style="border-top: 1px solid #EEE; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
        `
    });

    // Get doctor details without sensitive information
    const doctorDetails = await Doctor.findById(doctor._id).select("-password -refreshToken");

    res.status(201).json(new apiResponse(201, {
        doctor: doctorDetails,
        otp
    }, "Doctor registered successfully. Please verify your account using the OTP sent to your email."));
});

const updateVerifyStatus = asyncHandler(async (req, res) => {
    const { otp } = req.body;

    const doctor = await Doctor.findOneAndUpdate(
        { otp },
        { isVerified: true },
        { new: true }
    );

    if (!doctor) {
        return res.status(404).json(new apiError(404, {}, "Doctor not found"));
    }

    return res.status(200).json(new apiResponse(200, {
        doctor
    }, "Doctor verified successfully"));
});

const loginDoctor = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        return res.status(400).json(new apiError(400, {}, "All fields are required"));
    }

    // Find doctor by email
    const doctor = await Doctor.findOne({ email });

    if (!doctor) {
        return res.status(404).json(new apiError(404, {}, "Doctor not found"));
    }

    // Check if doctor is verified
    if (!doctor.isVerified) {
        return res.status(401).json(new apiError(401, {}, "Please verify your account first"));
    }

    // Check password
    const isPasswordValid = await doctor.isPasswordCorrect(password);

    if (!isPasswordValid) {
        return res.status(401).json(new apiError(401, {}, "Invalid credentials"));
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(doctor._id);

    // Get doctor details without sensitive information
    const loggedInDoctor = await Doctor.findById(doctor._id).select("-password -refreshToken");

    // Set cookies options
    const options = {
        httpOnly: true,
        secure: true
    };

    // Send response with cookies
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new apiResponse(200, {
            doctor: loggedInDoctor,
            accessToken,
            refreshToken
        }, "Doctor logged in successfully"));
});

const getCurrentDoctor = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                { doctor: req.doctor },
                "doctor fetched successfully"
            )
        );
});

const logoutDoctor = asyncHandler(async (req, res) => {
    const doctor = await Doctor.findById(req.doctor._id);

    if (!doctor) {
        return res.status(404).json(new apiError(404, {}, "Doctor not found"));
    }

    // Only perform logout actions if doctor has an active session
    if (doctor.refreshToken) {
        await Doctor.findByIdAndUpdate(
            req.doctor._id,
            { $set: { refreshToken: null } },
            { new: true }
        );
    }

    // Clear cookies with proper invalidation
    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, doctor.refreshToken
            ? "Doctor logged out successfully"
            : "No active session found"));
});

const getUnacceptedAppointments = asyncHandler(async (req, res) => {
    const doctorId = req.doctor._id;

    const appointments = await Appointment.find({
        doctorId,
        isaccepted: false
    }).populate({
        path: 'patientId',
        select: 'name phoneNumber address age gender dateOfBirth'
    });

    if (!appointments.length) {
        return res.status(404).json(
            new apiError(404, {}, "No unaccepted appointments found")
        );
    }

    return res.status(200).json(
        new apiResponse(200, appointments, "Unaccepted appointments retrieved successfully")
    );
});

const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const { appointmentId, status, time } = req.body;
    const doctorId = req.doctor._id;

    if (!appointmentId || !time || !status) {
        return res.status(400).json(new apiError(400, {}, "Appointment ID, status and time are required"));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
        return res.status(404).json(new apiError(404, {}, "Appointment not found"));
    }

    if (appointment.doctorId.toString() !== doctorId.toString()) {
        return res.status(403).json(new apiError(403, {}, "Unauthorized to update this appointment"));
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
        appointmentId,
        {
            isaccepted: status === 'accepted',
            time: time
        },
        { new: true }
    ).populate('patientId', 'email name');

    if (status === 'accepted') {
        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: "yellow06jacket@gmail.com",
                pass: "utnk wfpt hlfq hqae"
            }
        });

        const mailOptions = {
            from: '"HealthCare Portal" <healthcare@portal.com>',
            to: updatedAppointment.patientId.email,
            subject: 'Appointment Confirmation',
            html: `
                <h3>Your appointment has been confirmed!</h3>
                <p>Dear ${updatedAppointment.patientId.name},</p>
                <p>Your appointment with Dr. ${req.doctor.name} has been confirmed.</p>
                <p>Date: ${new Date(updatedAppointment.date).toLocaleDateString()}</p>
                <p>Time: ${updatedAppointment.time}</p>
                <p>Please arrive 15 minutes before your scheduled time.</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error('Error sending confirmation email:', emailError);
            return res.status(500).json(new apiError(500, {}, "Appointment updated but failed to send confirmation email"));
        }
    }

    return res.status(200).json(
        new apiResponse(200, updatedAppointment, "Appointment status updated successfully")
    );
});

const getUpdatedAppointment = asyncHandler(async (req, res) => {
    const doctorId = req.doctor._id;

    const appointments = await Appointment.find({
        isaccepted: true,
        doctorId: doctorId
    }).populate('patientId', 'name email uniqueId age gender phoneNumber')
        .select('date time isaccepted');

    if (!appointments.length) {
        return res.status(404).json(new apiError(404, {}, "No accepted appointments found"));
    }

    return res.status(200).json(
        new apiResponse(200, appointments, "Accepted appointments retrieved successfully")
    );
});

const getPatientByUniqueId = asyncHandler(async (req, res) => {
    const { uniqueId } = req.body;

    if (!uniqueId) {
        return res.status(400).json(new apiError(400, {}, "Patient unique ID is required"));
    }

    const patient = await Patient.findOne({ uniqueId })
        .populate("prescriptions")
        .populate("reports")
        .select('-password -refreshToken'); // Exclude sensitive fields

    if (!patient) {
        return res.status(404).json(new apiError(404, {}, "Patient not found"));
    }

    // Verify doctor has existing relationship with patient through accepted appointments
    const existingAppointment = await Appointment.findOne({
        doctorId: req.doctor._id,
        patientId: patient._id,
        isaccepted: true
    });

    if (!existingAppointment) {
        return res.status(403).json(new apiError(403, {}, "No accepted appointment exists with this patient"));
    }

    return res.status(200).json(
        new apiResponse(200, patient, "Patient details retrieved successfully")
    );
});

const getPrescriptionsByUniqueId = asyncHandler(async (req, res) => {
    const { uniqueId } = req.params;
    const doctorId = req.doctor._id;

    if (!uniqueId) {
        return res.status(400).json(new apiError(400, {}, "Patient unique ID is required"));
    }

    const patient = await Patient.findOne({ uniqueId });
    if (!patient) {
        return res.status(404).json(new apiError(404, {}, "Patient not found"));
    }

    // Check if doctor has an accepted appointment with this patient
    const existingAppointment = await Appointment.findOne({
        doctorId: doctorId,
        patientId: patient._id,
        isaccepted: true
    });

    if (!existingAppointment) {
        return res.status(403).json(new apiError(403, {}, "No accepted appointment exists with this patient"));
    }

    // Get all prescriptions for the patient
    const prescriptions = await Prescription.find({ patientId: patient._id })
        .populate('doctorId', 'name specialization')
        .populate('patientId', 'name uniqueId');

    if (!prescriptions.length) {
        return res.status(404).json(new apiError(404, {}, "No prescriptions found for this patient"));
    }

    return res.status(200).json(
        new apiResponse(200, prescriptions, "Prescriptions retrieved successfully")
    );
});

// const getReportsByUniqueId = asyncHandler(async (req, res) => {
//     const { uniqueId } = req.params;
//     const doctorId = req.doctor._id;

//     if (!uniqueId) {
//         return res.status(400).json(new apiError(400, {}, "Patient unique ID is required"));
//     }

//     const patient = await Patient.findOne({ uniqueId });
//     if (!patient) {
//         return res.status(404).json(new apiError(404, {}, "Patient not found"));
//     }

//     // Check if doctor has an accepted appointment with this patient
//     const existingAppointment = await Appointment.findOne({
//         doctorId: doctorId,
//         patientId: patient._id,
//         isaccepted: true
//     });

//     if (!existingAppointment) {
//         return res.status(403).json(new apiError(403, {}, "No accepted appointment exists with this patient"));
//     }

//     // Get all reports for the patient
//     const reports = await Report.find({ patientId: patient._id })
//         .populate('doctorId', 'name specialization')
//         .populate('patientId', 'name uniqueId');

//     if (!reports.length) {
//         return res.status(404).json(new apiError(404, {}, "No reports found for this patient"));
//     }

//     return res.status(200).json(
//         new apiResponse(200, reports, "Reports retrieved successfully")
//     );
// });

const addPrescription = asyncHandler(async (req, res) => {
    const doctorId = req.doctor._id;
    const { patientId } = req.body;

    if (!patientId) {
        return res.status(400).json(new apiError(400, {}, "Patient ID is required"));
    }

    if (!req.files || !req.files.PricptionImage || !req.files.PricptionImage.length) {
        return res.status(400).json(new apiError(400, {}, "Prescription images are required"));
    }

    const patient = await Patient.findById(patientId);
    if (!patient) {
        return res.status(404).json(new apiError(404, {}, "Patient not found"));
    }

    // Check if doctor has an accepted appointment with this patient
    const existingAppointment = await Appointment.findOne({
        doctorId: doctorId,
        patientId: patientId,
        isaccepted: true
    });

    if (!existingAppointment) {
        return res.status(403).json(new apiError(403, {}, "No accepted appointment exists with this patient"));
    }

    const prescriptionImages = [];
    const getFormattedDate = () => {
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    };

    // Upload prescription images
    for (const file of req.files.PricptionImage) {
        const fileContent = fs.readFileSync(file.path);
        const response = await imagekit.upload({
            file: fileContent,
            fileName: `${getFormattedDate()}-${file.originalname}`,
            folder: "/prescriptions",
        });
        fs.unlinkSync(file.path);

        prescriptionImages.push({
            url: response.url,
            fileId: response.fileId,
        });
    }

    // Create new prescription
    const prescription = await Prescription.create({
        doctorId,
        patientId,
        prescriptionImage: prescriptionImages,
        createdAt: new Date()
    });

    return res.status(201).json(
        new apiResponse(201, prescription, "Prescription added successfully")
    );
});

export {
    registerDoctor,
    updateVerifyStatus,
    loginDoctor,
    getCurrentDoctor,
    logoutDoctor,
    getUnacceptedAppointments,
    updateAppointmentStatus,
    getUpdatedAppointment,
    getPatientByUniqueId,
    // getPrescriptionsByUniqueId,
    // getReportsByUniqueId,
    addPrescription
};