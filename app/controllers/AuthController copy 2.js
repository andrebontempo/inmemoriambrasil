const bcrypt = require("bcrypt")
const crypto = require("crypto")
const User = require("../models/User")
const Memorial = require("../models/Memorial")
const AdminLog = require("../models/AdminLog")

const AuthController = {

  // ================================
  // Exibir formulário de cadastro
  // ================================
  showRegisterForm: (req, res) => {
    res.render("auth/register")
  },

  // ================================
  // Exibir formulário de login
  // ================================
  showLoginForm: (req, res) => {
    const redirectTo = req.session.redirectAfterLogin || null
    res.render("auth/login", { redirectTo })
  },

  // ================================
  // Processar login
  // ================================
  loginUser: async (req, res) => {
    try {
      let { email, password } = req.body

      if (!email || !password) {
        return res.status(400).render("auth/login", {
          error: "E-mail e senha são obrigatórios.",
        })
      }

      email = email.trim().toLowerCase()

      const user = await User.findOne({ email })
      if (!user) {
        return res.status(400).render("auth/login", {
          error: "E-mail ou senha inválidos.",
        })
      }

      const passwordMatch = await bcrypt.compare(password.trim(), user.password)

      if (!passwordMatch) {
        return res.status(400).render("auth/login", {
          error: "E-mail ou senha inválidos.",
        })
      }

      req.session.user = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      }

      const redirectTo = req.session.redirectAfterLogin || "/auth/dashboard"

      req.session.save(() => {
        delete req.session.redirectAfterLogin
        res.redirect(redirectTo)
      })

    } catch (err) {
      console.error("Erro no login:", err)
      res.status(500).render("auth/login", {
        error: "Erro ao fazer login. Tente novamente.",
      })
    }
  },

  // ================================
  // Dashboard
  // ================================
  showDashboard: async (req, res) => {
    if (!req.session.user) {
      return res.redirect("/auth/login")
    }

    try {
      const userId = req.session.user._id
      const memoriais = await Memorial.find({ owner: userId }).lean()

      res.render("auth/dashboard", {
        user: req.session.user,
        memoriais,
      })
    } catch (err) {
      console.error("Erro no dashboard:", err)
      res.status(500).send("Erro ao carregar o painel.")
    }
  },

  // ================================
  // Processar cadastro
  // ================================
  registerUser: async (req, res) => {
    try {
      let { firstName, lastName, email, password, confirmPassword } = req.body

      if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.render("auth/register", {
          error: "Todos os campos são obrigatórios.",
          firstName,
          lastName,
          email,
        })
      }

      email = email.trim().toLowerCase()

      if (password !== confirmPassword) {
        return res.render("auth/register", {
          error: "As senhas não coincidem.",
          firstName,
          lastName,
          email,
        })
      }

      if (password.length < 8) {
        return res.render("auth/register", {
          error: "A senha deve ter pelo menos 8 caracteres.",
          firstName,
          lastName,
          email,
        })
      }

      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.render("auth/register", {
          error: "E-mail já cadastrado.",
        })
      }

      const salt = await bcrypt.genSalt(10)
      const hashedPassword = await bcrypt.hash(password, salt)

      const newUser = new User({
        firstName,
        lastName,
        email,
        password: hashedPassword,
        authProvider: "local",
      })

      await newUser.save()

      await AdminLog.create({
        adminId: null,
        action: "USER_REGISTER",
        targetUserId: newUser._id,
        details: {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          authProvider: "local"
        }
      })

      req.session.user = {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      }

      req.session.save(() => {
        res.redirect("/auth/dashboard")
      })

    } catch (err) {
      console.error("Erro no cadastro:", err)
      res.status(500).render("auth/register", {
        error: "Erro ao cadastrar usuário. Tente novamente.",
      })
    }
  },

  // ================================
  // FORGOT PASSWORD (GET)
  // ================================
  showForgotPasswordForm: (req, res) => {
    res.render("auth/forgot-password")
  },

  // ================================
  // FORGOT PASSWORD (POST)
  // ================================
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body

      const user = await User.findOne({ email: email.trim().toLowerCase() })

      if (user) {
        const token = crypto.randomBytes(32).toString("hex")

        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000 // 1 hora

        await user.save()

        console.log(`LINK RESET: http://localhost:3000/auth/reset-password/${token}`)
      }

      res.render("auth/forgot-password", {
        success: "Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha."
      })

    } catch (err) {
      console.error("Erro no forgot-password:", err)
      res.render("auth/forgot-password", {
        error: "Erro ao processar solicitação."
      })
    }
  },

  // ================================
  // RESET PASSWORD (GET)
  // ================================
  showResetPasswordForm: async (req, res) => {
    try {
      const { token } = req.params

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      })

      if (!user) {
        return res.redirect("/auth/forgot-password")
      }

      res.render("auth/reset-password", { token })

    } catch (err) {
      res.redirect("/auth/forgot-password")
    }
  },

  // ================================
  // RESET PASSWORD (POST)
  // ================================
  resetPassword: async (req, res) => {
    try {
      const { token } = req.params
      const { password, confirmPassword } = req.body

      if (password !== confirmPassword) {
        return res.render("auth/reset-password", {
          token,
          error: "As senhas não coincidem."
        })
      }

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      })

      if (!user) {
        return res.redirect("/auth/forgot-password")
      }

      const salt = await bcrypt.genSalt(10)
      user.password = await bcrypt.hash(password, salt)

      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined

      await user.save()

      res.redirect("/auth/login")

    } catch (err) {
      console.error("Erro no reset-password:", err)
      res.redirect("/auth/forgot-password")
    }
  },

  // ================================
  // Logout
  // ================================
  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect("/")
    })
  },
}

module.exports = AuthController
