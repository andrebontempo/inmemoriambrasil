const mongoose = require("mongoose")

const mediaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  caption: { type: String, default: "" },
  uploadDate: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
})

const GallerySchema = new mongoose.Schema({
  memorial: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Memorial",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  photos: [mediaSchema],
  audios: [mediaSchema],
  videos: [mediaSchema],
})

module.exports = mongoose.model("Gallery", GallerySchema)
