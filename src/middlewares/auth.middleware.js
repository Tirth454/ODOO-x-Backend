import jwt from "jsonwebtoken"
import Patient from "../models/patient.model.js"
import Doctor from "../models/doctor.model.js"
// import Laboratory from "../models/laboratory.model.js"
// import Medical from "../models/medical.model.js"
import apiResponse from "../utils/apiResponse.js"
import apiError from "../utils/apiError.js"

// Check Authorization Middleware
const checkAuth = async (req, res, next) => {
    const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    const refreshToken = req.cookies?.refreshToken

    if (!accessToken || !refreshToken) {
        return res.status(401).json(new apiError(401, {}, "unauthorized request"))
    }

    // Verify Access Token
    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        const patient = await Patient.findById(decoded._id).select("-password")
        const doctor = await Doctor.findById(decoded._id).select("-password")
        const laboratory = await Laboratory.findById(decoded._id).select("-password")
        const medical = await Medical.findById(decoded._id).select("-password")

        if (!patient && !doctor && !laboratory && !medical) {
            return res.status(404).json(new apiError(404, {}, "User not found"))
        }

        if (patient) {
            req.patient = patient
        }
        if (doctor) {
            req.doctor = doctor
        }
        if (laboratory) {
            req.laboratory = laboratory
        }
        if (medical) {
            req.medical = medical
        }
        next()
    } catch (err) {
        return handleAccessTokenExpired(req, res, refreshToken, next)
    }
}

// Handle Expired Access Token and Refresh Logic
const handleAccessTokenExpired = (req, res, refreshToken, next) => {
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decodedUser) => {
        if (err) {
            const patient = await Patient.findOne({ refreshToken })
            const doctor = await Doctor.findOne({ refreshToken })
            const laboratory = await Laboratory.findOne({ refreshToken })
            const medical = await Medical.findOne({ refreshToken })

            if (!patient && !doctor && !laboratory && !medical) {
                return handleLogout(req, res)
            }

            // Clear refresh token in database
            if (patient) {
                await Patient.findByIdAndUpdate(patient._id, { refreshToken: null }, { new: true })
            }
            if (doctor) {
                await Doctor.findByIdAndUpdate(doctor._id, { refreshToken: null }, { new: true })
            }
            if (laboratory) {
                await Laboratory.findByIdAndUpdate(laboratory._id, { refreshToken: null }, { new: true })
            }
            if (medical) {
                await Medical.findByIdAndUpdate(medical._id, { refreshToken: null }, { new: true })
            }
            return handleLogout(req, res)
        }

        // Generate new Access Token if Refresh Token is valid
        const patient = await Patient.findById(decodedUser._id)
        const doctor = await Doctor.findById(decodedUser._id)
        const laboratory = await Laboratory.findById(decodedUser._id)
        const medical = await Medical.findById(decodedUser._id)

        if (!patient && !doctor && !laboratory && !medical) {
            return res.status(404).json(new apiError(404, {}, "User not found"))
        }

        let accessToken
        if (patient) {
            accessToken = patient.generateAccessToken()
            req.patient = patient
        } else if (doctor) {
            accessToken = doctor.generateAccessToken()
            req.doctor = doctor
        } else if (laboratory) {
            accessToken = laboratory.generateAccessToken()
            req.laboratory = laboratory
        } else {
            accessToken = medical.generateAccessToken()
            req.medical = medical
        }
        res.cookie("accessToken", accessToken)

        next()
    })
}

// Handle Logout (Clear Cookies and Send Session Expired Response)
const handleLogout = async (req, res) => {
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    }

    return res
        .status(419)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new apiResponse(419, {}, "session expired"))
}

export default checkAuth
