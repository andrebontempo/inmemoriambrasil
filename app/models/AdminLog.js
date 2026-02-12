const mongoose = require("mongoose")

const AdminLogSchema = new mongoose.Schema({
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: false
    },
    action: {
        type: String,
        required: true
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    changes: {
        type: Object
    },
    ip: String,
    userAgent: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model("AdminLog", AdminLogSchema)
