import mongoose from "mongoose";

const campSchema = new mongoose.Schema({
    campName: {
        type: String,
        required: true,
        trim: true
    },
    campDate: {
        type: Date,
        required: true
    },
    campLocation: {
        type: String,
        required: true,
        trim: true
    },
    campDescription: {
        type: String,
        required: true,
        trim: true
    },
    campOrganizer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Doctor",
        required: [true, "Doctor ID is required"]
    },
    campParticipants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
        required: true
    }]
}, {
    timestamps: true
});

const Camp = mongoose.model('Camp', campSchema);

export default Camp;
