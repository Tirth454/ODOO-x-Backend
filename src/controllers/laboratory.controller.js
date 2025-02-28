import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiResponse from "../utils/apiResponse.js";
import Laboratory from "../models/laboratory.model.js";
import Patient from "../models/patient.model.js";
import Prescription from "../models/presciption.model.js";
import nodeMailer from "nodemailer";

const generateAccessAndRefreshToken = async (laboratoryId) => {
    try {
        const laboratory = await Laboratory.findById(laboratoryId);
        const accessToken = laboratory.generateAccessToken();
        const refreshToken = laboratory.generateRefreshToken();

        laboratory.refreshToken = refreshToken;
        await laboratory.save({ validateBeforeSave: false });

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

// ... existing generateotp function ...

const registerLaboratory = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        licenseNumber,
        address,
        contactNumber,

    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !licenseNumber || !contactNumber) {
        throw new apiError(400, "All fields are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        throw new apiError(400, "Invalid email format");
    }

    // Check if laboratory already exists
    const existingLaboratory = await Laboratory.findOne({
        $or: [
            { email },
            { licenseNumber },
            { contactNumber }
        ]
    });

    if (existingLaboratory) {
        let field = "email";
        if (existingLaboratory.licenseNumber === licenseNumber) field = "license number";
        if (existingLaboratory.contactNumber === contactNumber) field = "contact number";
        throw new apiError(400, `Laboratory already registered with this ${field}`);
    }

    // Generate OTP
    const otp = generateotp();

    // Create laboratory
    const laboratory = await Laboratory.create({
        name,
        email,
        password,
        licenseNumber,
        address: address || {},
        contactNumber,
        isVerified: false,
        otp
    });

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
        subject: "Laboratory Registration - OTP Verification",
        text: `Dear Laboratory Team,

Welcome to our Healthcare Portal!

Your OTP for account verification is: ${otp}

Please use this OTP to verify your account. The OTP is valid for a limited time.

For security reasons, please do not share your OTP or login credentials with anyone.

Best Regards,
Healthcare Portal Team`,

        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Welcome to Healthcare Portal</h2>
            
            <p>Dear Laboratory Team,</p>
            
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
        </div>
        `
    });

    const laboratoryDetails = await Laboratory.findById(laboratory._id)
        .select("-password -refreshToken -otp");

    return res.status(201).json(new apiResponse(201, {
        laboratory: laboratoryDetails,
    }, "Laboratory registered successfully. Please verify your account using the OTP sent to your email."));
});

const updateVerifyStatus = asyncHandler(async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        throw new apiError(400, "Email and OTP are required");
    }

    const laboratory = await Laboratory.findOneAndUpdate(
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

    if (!laboratory) {
        throw new apiError(400, "Invalid OTP or email");
    }

    return res.status(200).json(
        new apiResponse(200, { laboratory }, "Laboratory verified successfully")
    );
});

const loginLaboratory = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new apiError(400, "Email and password are required");
    }

    const laboratory = await Laboratory.findOne({ email });

    if (!laboratory) {
        throw new apiError(404, "Laboratory not found");
    }

    if (!laboratory.isVerified) {
        throw new apiError(401, "Please verify your laboratory first");
    }

    const isPasswordValid = await laboratory.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new apiError(401, "Invalid credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(laboratory._id);
    const loggedInLaboratory = await Laboratory.findById(laboratory._id)
        .select("-password -refreshToken -otp");

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
                laboratory: loggedInLaboratory,
                accessToken,
                refreshToken
            }, "Laboratory logged in successfully")
        );
});

const getCurrentLaboratory = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                { laboratory: req.laboratory },
                "Laboratory fetched successfully"
            )
        );
});

const logoutLaboratory = asyncHandler(async (req, res) => {
    await Laboratory.findByIdAndUpdate(
        req.laboratory._id,
        {
            $unset: { refreshToken: 1 }
        },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(200, {}, "Laboratory logged out successfully"));
});

const getReportsByUniqueId = asyncHandler(async (req, res) => {
    const { uniqueId } = req.body;

    // Validate uniqueId
    if (!uniqueId) {
        throw new apiError(400, "Patient unique ID is required");
    }

    // Find patient
    const patient = await Patient.findOne({ uniqueId });
    if (!patient) {
        throw new apiError(404, "Patient not found");
    }

    // Find reports for the patient from the laboratory
    const reports = await Report.find({
        patientId: patient._id,
        laboratoryId: req.laboratory._id
    })
        .populate('patientId', 'name uniqueId')
        .populate('laboratoryId', 'name licenseNumber')

    if (!reports.length) {
        throw new apiError(404, "No reports found for this patient");
    }

    return res.status(200).json(
        new apiResponse(
            200,
            {
                reports
            },
            "Patient reports retrieved successfully"
        )
    );
});

const addReport = asyncHandler(async (req, res) => {
    const { uniqueId } = req.body; // Get uniqueId from request body
    const laboratoryId = req.laboratory._id; // Get laboratory ID from the request context

    if (!uniqueId) {
        throw new apiError(400, "Patient unique ID is required");
    }

    if (!req.files || !req.files.reportImage || !req.files.reportImage.length) {
        throw new apiError(400, "Report images are required");
    }

    // Find patient by unique ID
    const patient = await Patient.findOne({ uniqueId });
    if (!patient) {
        throw new apiError(404, "Patient not found");
    }

    const reportImages = [];
    const getFormattedDate = () => {
        const date = new Date();
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    };

    // Upload report images
    for (const file of req.files.reportImages) {
        const fileContent = fs.readFileSync(file.path);
        const response = await imagekit.upload({
            file: fileContent,
            fileName: `${getFormattedDate()}-${file.originalname}`,
            folder: "/reports",
        });
        fs.unlinkSync(file.path); // Remove the file after uploading

        reportImages.push({
            url: response.url,
            fileId: response.fileId,
        });
    }

    // Create new report
    const report = await Report.create({
        laboratoryId,
        patientId: patient._id,
        reportImages,
        createdAt: new Date()
    });

    // Add report ID to patient's reports array
    await Patient.findByIdAndUpdate(
        patient._id,
        {
            $push: { reports: report._id }
        }
    );

    return res.status(201).json(
        new apiResponse(201, report, "Report added successfully")
    );
});

const getPrescriptionsByUniqueId = asyncHandler(async (req, res) => {
    const { uniqueId } = req.body;

    if (!uniqueId) {
        return res.status(400).json(new apiError(400, {}, "Patient unique ID is required"));
    }

    const patient = await Patient.findOne({ uniqueId });
    if (!patient) {
        return res.status(404).json(new apiError(404, {}, "Patient not found"));
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





export {
    registerLaboratory,
    updateVerifyStatus,
    loginLaboratory,
    getCurrentLaboratory,
    logoutLaboratory,
    getReportsByUniqueId,
    addReport,
    getPrescriptionsByUniqueId
};