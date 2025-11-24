const mongoose = require("mongoose")

const mediaSchema = new mongoose.Schema({
  key: { type: String, required: true }, // caminho no bucket
  url: { type: String, required: true }, // link público
  originalName: { type: String, required: true }, // nome original
  caption: { type: String, default: "" }, // legenda opcional
  uploadDate: { type: Date, default: Date.now }, // data de envio
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
