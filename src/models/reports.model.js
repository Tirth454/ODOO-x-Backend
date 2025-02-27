import mongoose from "mongoose";

const reportSchema = new mongoose.Schema({
    reportImage: {
        type: String,
        required: [true, "Report image URL is required"],
        trim: true
    },
    laboratoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Laboratory",
        required: [true, "Laboratory ID is required"]
    },
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: [true, "Patient ID is required"]
    }
}, {
    timestamps: true
});

const Report = mongoose.model('Report', reportSchema);

export default Report;
