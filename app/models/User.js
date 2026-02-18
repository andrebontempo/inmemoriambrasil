const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true
    },

    lastName: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local"
      },
    },

    googleId: {
      type: String,
      unique: true,
      sparse: true
    },

    avatar: {
      type: String,
      default: "/css/main/files/user_default.png",
    },

    authProvider: {
      type: String,
      enum: ["local", "google"],
      required: true,
    },

    resetPasswordToken: {
      type: String,
      index: true,
    },

    resetPasswordExpires: Date,

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    bio: {
      type: String,
      maxlength: 500
    },

    location: {
      type: String,
      maxlength: 100
    },

    // ==========================
    // 🔹 WHATSAPP / TELEFONE
    // ==========================

    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      match: [/^\+\d{10,15}$/, "Número deve estar no formato internacional. Ex: +5511999999999"]
    },

    phoneVerified: {
      type: Boolean,
      default: false
    },

    whatsappOptIn: {
      type: Boolean,
      default: false
    },

    whatsappStatus: {
      type: String,
      enum: ["active", "blocked", "opted_out"],
      default: "active"
    },

    lastWhatsappContact: Date
  },
  { timestamps: true }
)


// ==========================
// 🔹 HOOK PRE-SAVE
// ==========================

UserSchema.pre("save", async function (next) {

  if (this.email) {
    this.email = String(this.email).trim().toLowerCase()
  }

  if (this.phone) {
    this.phone = String(this.phone).trim()
  }

  if (!this.isModified("password") || !this.password) return next()

  try {
    const salt = await bcrypt.genSalt(10)
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (err) {
    next(err)
  }
})


// ==========================
// 🔹 MÉTODOS
// ==========================

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

UserSchema.methods.fullName = function () {
  return `${this.firstName} ${this.lastName}`
}


// ==========================
// 🔹 EXPORT
// ==========================

module.exports = mongoose.model("User", UserSchema)
