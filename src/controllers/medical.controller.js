import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiResponse from "../utils/apiResponse.js";
import Medical from "../models/medical.model.js";
import Patient from "../models/patient.model.js";
import Prescription from "../models/presciption.model.js";
import nodeMailer from "nodemailer";

const generateAccessAndRefreshToken = async (medicalId) => {
    try {
        const medical = await Medical.findById(medicalId);
        const accessToken = medical.generateAccessToken();
        const refreshToken = medical.generateRefreshToken();

        medical.refreshToken = refreshToken;
        await medical.save({ validateBeforeSave: false });

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

const registerMedical = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        businessNo,
        address,
        contactNumber
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !businessNo || !contactNumber) {
        throw new apiError(400, "All fields are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new apiError(400, "Invalid email format");
    }

    // Check if medical center already exists with email, business number or contact
    const existingMedical = await Medical.findOne({
        $or: [
            { email },
            { businessNo },
            { contactNumber }
        ]
    });

    if (existingMedical) {
        let field = "email";
        if (existingMedical.businessNo === businessNo) field = "business number";
        if (existingMedical.contactNumber === contactNumber) field = "contact number";
        throw new apiError(400, `Medical center already registered with this ${field}`);
    }

    // Generate OTP
    const otp = generateotp();

    // Create medical center
    const medical = await Medical.create({
        name,
        email,
        password,
        businessNo,
        address: address || {},
        contactNumber,
        isVerified: false,
        otp
    });

    // Send verification email with OTP
    const transporter = nodeMailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_EMAIL || "yellow06jacket@gmail.com",
            pass: process.env.SMTP_PASSWORD || "utnk wfpt hlfq hqae",
        },
    });

    const info = await transporter.sendMail({
        from: '"HealthCare Portal" <healthcare@portal.com>',
        to: email,
        subject: "Medical Center Registration - OTP Verification",
        text: `Dear Medical Center Team,

Welcome to our Healthcare Portal!

Your OTP for account verification is: ${otp}

Please use this OTP to verify your account. The OTP is valid for a limited time.

For security reasons, please do not share your OTP or login credentials with anyone.

Best Regards,
Healthcare Portal Team`,

        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Welcome to Healthcare Portal</h2>
            
            <p>Dear Medical Center Team,</p>
            
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

    const medicalDetails = await Medical.findById(medical._id).select("-password -refreshToken -otp");

    return res.status(201).json(new apiResponse(201, {
        medical: medicalDetails,
    }, "Medical center registered successfully. Please verify your account using the OTP sent to your email."));
});

const updateVerifyStatus = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new apiError(400, "Email and OTP are required");
    }

    const medical = await Medical.findOneAndUpdate(
        {
            email,
            otp,
            isVerified: false
        },
        {
            isVerified: true,
            $unset: { otp: 1 }
        },
        { new: true }
    ).select("-password -refreshToken -otp");

    if (!medical) {
        throw new apiError(400, "Invalid OTP or email");
    }

    return res.status(200).json(
        new apiResponse(200, { medical }, "Medical center verified successfully")
    );
});

const loginMedical = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new apiError(400, "Email and password are required");
    }

    const medical = await Medical.findOne({ email });

    if (!medical) {
        throw new apiError(404, "Medical center not found");
    }

    if (!medical.isVerified) {
        throw new apiError(401, "Please verify your center first");
    }

    const isPasswordValid = await medical.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(medical._id);
    const loggedInMedical = await Medical.findById(medical._id).select("-password -refreshToken -otp");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(200, {
                medical: loggedInMedical,
                accessToken,
                refreshToken
            }, "Medical center logged in successfully")
        );
});

const getCurrentMedical = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                { medical: req.medical },
                "medical fetched successfully"
            )
        );
});

const logoutMedical = asyncHandler(async (req, res) => {
    const medical = await Medical.findById(req.medical._id);

    if (!medical) {
        return res.status(404).json(new apiError(404, {}, "Medical center not found"));
    }

    // Only perform logout actions if medical center has an active session
    if (medical.refreshToken) {
        await Medical.findByIdAndUpdate(
            req.medical._id,
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
        .json(new apiResponse(200, {}, medical.refreshToken
            ? "Medical center logged out successfully"
            : "No active session found"));
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

export { registerMedical, updateVerifyStatus, loginMedical, getCurrentMedical, logoutMedical };