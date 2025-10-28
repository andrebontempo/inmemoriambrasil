const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },

    // Senha apenas para usuários que se cadastrarem manualmente
    password: { type: String },

    // Login social via Google
    googleId: { type: String, unique: true, sparse: true },

    // Avatar do usuário
    avatar: { type: String, default: "/images/default-avatar.png" },

    // Define o método de autenticação usado
    authProvider: { type: String, enum: ["local", "google"], required: true },

    // Permissões (padrão: "user")
    role: { type: String, enum: ["user", "admin"], default: "user" },

    // Biografia e localização (opcionais)
    bio: { type: String, maxlength: 500 },
    location: { type: String, maxlength: 100 },
  },
  { timestamps: true } // Adiciona createdAt e updatedAt
)

// 🔒 Hash da senha antes de salvar no banco
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next()
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
  next()
})

// 🔑 Método para comparar senha no login
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password)
}

module.exports = mongoose.model("User", UserSchema)
