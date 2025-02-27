import mongoose from "mongoose";

const prescriptionSchema = new mongoose.Schema({
    prescriptionImage: [{
        type: String,
        required: [true, "Prescription image URL is required"],
        trim: true
    }],
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: [true, "Patient ID is required"]
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: [true, "Doctor ID is required"]
    }
}, {
    timestamps: true
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

export default Prescription;