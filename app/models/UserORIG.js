const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },

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

    googleId: { type: String, unique: true, sparse: true },

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

    bio: { type: String, maxlength: 500 },
    location: { type: String, maxlength: 100 },
  },
  { timestamps: true }
)

UserSchema.pre("save", async function (next) {
  if (this.email) {
    this.email = String(this.email).trim().toLowerCase()
  }

  if (!this.isModified("password") || !this.password) return next()

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("User", UserSchema)
