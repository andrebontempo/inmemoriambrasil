const crypto = require("crypto")
const passport = require("passport")
const { sendEmail } = require("../services/MailService")

const User = require("../models/User")
const Memorial = require("../models/Memorial")
const AdminLog = require("../models/AdminLog")
const { escapeRegex } = require("../utils/regexHelpers")

const AuthController = {

  // ================================
  // REGISTER (GET)
  // ================================
  showRegisterForm: (req, res) => {
    res.render("auth/register")
  },

  // ================================
  // LOGIN (GET)
  // ================================
  showLoginForm: (req, res) => {
    const redirectTo = req.session.redirectAfterLogin || null
    res.render("auth/login", { redirectTo })
  },

  // ================================
  // LOGIN (POST) — via Passport Local
  // ================================
  loginUser: (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(400).render("auth/login", {
          error: info?.message || "E-mail ou senha inválidos.",
        });
      }
      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        // Força o salvamento da sessão antes de redirecionar
        req.session.save((err) => {
          if (err) {
            console.error("Erro ao salvar sessão:", err);
            return next(err);
          }
          const redirectTo = req.session.redirectAfterLogin || "/auth/dashboard";
          delete req.session.redirectAfterLogin;
          return res.redirect(redirectTo);
        });
      });
    })(req, res, next);
  },

  // ================================
  // DASHBOARD
  // ================================
  showDashboard: async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/auth/login")
    }

    try {
      const userId = req.user._id
      const query = req.query.q ? req.query.q.trim() : ""
      const page = parseInt(req.query.page) || 1
      const limit = 5
      const skip = (page - 1) * limit

      let searchFilter = { owner: userId }
      if (query) {
        const escapedQuery = escapeRegex(query)
        searchFilter.$or = [
          { firstName: { $regex: escapedQuery, $options: "i" } },
          { lastName: { $regex: escapedQuery, $options: "i" } },
          { slug: { $regex: escapedQuery, $options: "i" } }
        ]
      }

      const totalMemoriais = await Memorial.countDocuments(searchFilter)
      const totalPages = Math.ceil(totalMemoriais / limit)

      const memoriais = await Memorial.find(searchFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

      res.render("auth/dashboard", {
        user: req.user,
        memoriais,
        query,
        pagination: {
          total: totalMemoriais,
          totalPages,
          currentPage: page,
          hasNext: page < totalPages,
          hasPrev: page > 1,
          nextPage: page + 1,
          prevPage: page - 1,
          limit
        }
      })
    } catch (err) {
      console.error("Erro no dashboard:", err)
      res.status(500).send("Erro ao carregar o painel.")
    }
  },

  // ================================
  // REGISTER (POST)
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

      if (password.length < 4) {
        return res.render("auth/register", {
          error: "A senha deve ter pelo menos 4 caracteres.",
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

      const newUser = new User({
        firstName,
        lastName,
        email,
        password: password.trim(), // hash será feito no Model
        authProvider: "local",
      })

      await newUser.save()

      await AdminLog.create({
        adminId: null,
        action: "USER_REGISTER",
        targetUserId: newUser._id,
        details: { email: newUser.email }
      })

      // 🔥 ENVIO DE E-MAIL DE BOAS-VINDAS
      try {
        await sendEmail({
          to: newUser.email,
          subject: "Bem-vindo ao In Memoriam Brasil",
          html: `
          <h2>Olá, ${newUser.firstName}!</h2>
          <p>Sua conta foi criada com sucesso.</p>
          <p>Agora você pode criar memoriais, gerenciar homenagens e acessar seu painel.</p>
          <br/>
          <p>Se você não criou esta conta, entre em contato conosco imediatamente.</p>
          <br/>
          <p>Equipe In Memoriam Brasil</p>
        `,
        })
      } catch (emailErr) {
        console.error("Erro ao enviar email de boas vindas (não crítico):", emailErr)
      }

      // Login automático via Passport após registro
      req.logIn(newUser, (err) => {
        if (err) {
          console.error("Erro ao logar após registro:", err)
          return res.redirect("/auth/login")
        }
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
      let { email } = req.body

      if (!email) {
        return res.render("auth/forgot-password", {
          error: "Informe seu e-mail.",
        })
      }

      email = email.trim().toLowerCase()
      const user = await User.findOne({ email })

      if (user) {
        const token = crypto.randomBytes(32).toString("hex")

        user.resetPasswordToken = token
        user.resetPasswordExpires = Date.now() + 3600000

        await user.save()

        const baseUrl = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "")
        const resetLink = `${baseUrl}/auth/reset-password/${token}`

        await sendEmail({
          to: user.email,
          subject: "Redefinição de senha",
          html: `
            <h2>Redefinição de senha</h2>
            <p>Clique no link abaixo para redefinir sua senha:</p>
            <a href="${resetLink}">${resetLink}</a>
            <p>O link expira em 1 hora.</p>
          `,
        })
      }

      res.render("auth/forgot-password", {
        success: "Se o e-mail estiver cadastrado, você receberá instruções.",
      })

    } catch (err) {
      console.error("Erro no forgot-password:", err)
      res.render("auth/forgot-password", {
        error: "Erro ao processar solicitação.",
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

    } catch {
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

      if (!password || !confirmPassword) {
        return res.render("auth/reset-password", {
          token,
          error: "Preencha todos os campos.",
        })
      }

      if (password !== confirmPassword) {
        return res.render("auth/reset-password", {
          token,
          error: "As senhas não coincidem.",
        })
      }

      if (password.length < 4) { // Mantendo o requisito de 4 caracteres que o usuário pediu
        return res.render("auth/reset-password", {
          token,
          error: "A senha deve ter pelo menos 4 caracteres.",
        })
      }

      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      })

      if (!user) {
        return res.redirect("/auth/forgot-password")
      }

      // ⚠️ NÃO FAZ HASH AQUI se o hook pre-save do mongoose estiver ativo
      user.password = password.trim()
      user.resetPasswordToken = undefined
      user.resetPasswordExpires = undefined

      await user.save()

      await AdminLog.create({
        adminId: null,
        action: "USER_PASSWORD_RESET",
        targetUserId: user._id,
        details: { email: user.email }
      })

      res.render("auth/reset-password", {
        success: "Senha redefinida com sucesso."
      })

    } catch (err) {
      console.error("Erro no reset-password:", err)
      res.redirect("/auth/forgot-password")
    }
  },

  // ================================
  // LOGOUT
  // ================================
  logout: (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      req.session.destroy((err) => {
        res.redirect('/');
      });
    });
  },
}

module.exports = AuthController
