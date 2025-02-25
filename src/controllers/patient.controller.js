import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import apiResponse from "../utils/apiResponse.js";
import Patient from "../models/patient.model.js"; // Import Patient model

// Register Patient

const generateUniqueId = () => {
    // Pre-define length constants
    const LETTER_LENGTH = 2;
    const NUMBER_LENGTH = 4;
    
    // Use array methods instead of loops for better performance
    const letters = Array.from({ length: LETTER_LENGTH }, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
    ).join('');
    
    const numbers = Array.from({ length: NUMBER_LENGTH }, () =>
        Math.floor(Math.random() * 10)
    ).join('');

    return letters + numbers;
}

const generateAccessAndRefreshToken = async (patientId) => {
    try {
        const patient = await Patient.findById(patientId);
        const accessToken = patient.generateAccessToken();
        const refreshToken = patient.generateRefreshToken();

        patient.refreshToken = refreshToken;
        await patient.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new apiError(500, "Error generating tokens");
    }
};

const registerPatient = asyncHandler(async (req, res) => {
    const { name, age, gender, dateOfBirth, email, password, phoneNumber, address } = req.body;

    // Validate required fields
    if (!name || !age || !gender || !dateOfBirth || !email || !password || !phoneNumber || !address) {
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

    // Check if patient already exists with the given email
    const existingPatient = await Patient.findOne({ email });
    if (existingPatient) {
        return res.status(400).json(new apiError(400, {}, "Patient already registered with this email"));
    }

    // Generate unique ID and check if it already exists
    let uniqueId;
    let isUnique = false;
    while (!isUnique) {
        uniqueId = generateUniqueId();
        const existingPatient = await Patient.findOne({ uniqueId });
        if (!existingPatient) {
            isUnique = true;
        }
    }

    // Create patient
    const patient = await Patient.create({
        name,
        age,
        gender,
        dateOfBirth,
        email,
        password,
        phoneNumber,
        address,
        uniqueId,
        isVerified: false
    });

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(patient._id);

    // Send verification email
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
        subject: "Your Patient ID Details",
        text: `Dear ${name},

Welcome to our Healthcare Portal!

Your unique Patient ID details are:
Patient ID: ${uniqueId}

Please keep these details safe as they will be required for all future interactions with our healthcare services.

For security reasons, please do not share these details with anyone.

If you did not request this information, please contact our support team immediately.

Best Regards,
Healthcare Portal Team

Note: This is an automated message. Please do not reply to this email.`,

        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0066cc;">Welcome to Healthcare Portal</h2>
            
            <p>Dear ${name},</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3 style="color: #333;">Your Patient ID Details:</h3>
                <p>Patient ID: <strong style="font-size: 18px; color: #0066cc;">${uniqueId}</strong></p>
                
            </div>
            
            <p><strong>Important:</strong> Please keep these details safe as they will be required for all future interactions with our healthcare services.</p>
            
            <p style="color: #666;">For security reasons, please do not share these details with anyone.</p>
            
            <div style="margin-top: 30px;">
                <p>Best Regards,</p>
                <p><strong style="color: #0066cc;">Healthcare Portal Team</strong></p>
            </div>
            
            <hr style="border-top: 1px solid #EEE; margin: 20px 0;">
            
            <p style="color: #999; font-size: 12px;">If you did not request this information, please contact our support team immediately.</p>
            <p style="color: #999; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
        </div>
        `
    });

    // Get patient details without sensitive information
    const patientDetails = await Patient.findById(patient._id).select("-password -refreshToken");

    res.status(201).json(new apiResponse(201, {
        accessToken,
        refreshToken,
        patient: patientDetails,
        uniqueId
    }, "Patient registered successfully and verification email sent"));
});


const updateVerifyStatus = asyncHandler(async (req, res) => {
    const { uniqueId } = req.body;

    const patient = await Patient.findOneAndUpdate(
        { uniqueId },
        { isVerified: true },
        { new: true }
    );

    if (!patient) {
        return res.status(404).json(new apiError(404, {}, "Patient not found"));
    }   

    return res.status(200).json(new apiResponse(200, {
        patient
    }, "Patient verified successfully"));
});

export { registerPatient, updateVerifyStatus };
