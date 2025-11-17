const bcrypt = require("bcrypt") // Use a biblioteca bcrypt original
const User = require("../models/User")
const Memorial = require("../models/Memorial") // Importe o modelo Memorial
const mongoose = require("mongoose")

const AuthController = {
  // Exibir o formulário de cadastro
  showRegisterForm: (req, res) => {
    res.render("auth/register")
  },

  // Exibir o formulário de login
  showLoginForm: (req, res) => {
    const redirectTo = req.session.redirectAfterLogin || null
    res.render("auth/login", { redirectTo })
  },

  /*
  showLoginForm: (req, res) => {
    res.render("auth/login")
  },
  */
  // Processar o login do usuário
  loginUser: async (req, res) => {
    try {
      let { email, password } = req.body

      // Validações básicas de entrada
      if (!email || !password) {
        return res
          .status(400)
          .render("auth/login", { error: "E-mail e senha são obrigatórios." })
      }

      email = String(email).trim().toLowerCase()

      // Verifica se o usuário existe (não informar diferença entre 'não existe' e 'senha inválida' para evitar enumeração)
      const user = await User.findOne({ email }) // Busca direta

      if (!user) {
        return res
          .status(400)
          .render("auth/login", { error: "E-mail ou senha inválidos." })
      }

      // Verifica se a senha está correta
      const isMatch = await bcrypt.compare(
        String(password).trim(),
        user.password
      )

      if (!isMatch) {
        return res
          .status(400)
          .render("auth/login", { error: "E-mail ou senha inválidos." })
      }

      // Armazena dados do usuário na sessão
      req.session.loggedUser = {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }

      // Sessão preenchida com dados do usuário (será salva abaixo)

      // Redireciona para a URL original, se existir
      /*
      console.log(
        "loginUser - Redirecionando para:",
        req.session.redirectAfterLogin
      )
      */
      const redirectTo = req.session.redirectAfterLogin || "/auth/dashboard"

      // Garante que a sessão será salva antes de redirecionar
      req.session.save(() => {
        // garante persistência antes do redirect
        delete req.session.redirectAfterLogin
        // redireciona após garantir que a sessão foi persistida
        res.redirect(redirectTo)
      })

      /*
      delete req.session.redirectAfterLogin
      return res.redirect(redirectTo)
      */
      //res.redirect("/auth/dashboard") // Redireciona para o painel do usuário
    } catch (error) {
      console.error("Erro ao processar login:", error)
      res.status(500).render("auth/login", { error: "Erro ao fazer login." })
    }
  },

  // Exibir o painel do usuário autenticado com seus memoriais
  showDashboard: async (req, res) => {
    // Verifica se o usuário está autenticado
    console.log(
      `[auth] showDashboard - sessionID=${req.sessionID}`,
      "keys=",
      Object.keys(req.session || {})
    )
    if (!req.session.loggedUser) {
      return res.redirect("/auth/login")
    }

    try {
      //console.log("Usuário autenticado:", req.session.loggedUser)

      // Busca todos os memoriais onde o campo 'user' corresponde ao ID do usuário autenticado
      const userId = req.session.loggedUser._id
      const memoriais = await Memorial.find({ user: userId }).lean() // Retorna objetos JSON para Handlebars

      //console.log("Memoriais encontrados:", memoriais) // Verifica no console

      // Renderiza o dashboard e passa os memoriais encontrados
      res.render("auth/dashboard", { user: req.session.loggedUser, memoriais })
    } catch (err) {
      console.error("Erro ao buscar memoriais do usuário:", err)
      res.status(500).send("Erro ao carregar o painel")
    }
  },

  /*
  // Exibir o painel do usuário autenticado
  showDashboard: (req, res) => {
    // Verifica se o usuário está autenticado
    if (!req.session.loggedUser) {
      return res.redirect("/auth/login")
    }
    console.log("Usuário autenticado:", req.session.loggedUser)
    // Renderiza a página do painel do usuário
    res.render("auth/dashboard", { user: req.session.loggedUser })
  },
*/
  // Processar o cadastro do usuário
  registerUser: async (req, res) => {
    try {
      let { firstName, lastName, email, password, confirmPassword } = req.body

      // Validações básicas
      if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.render("auth/register", {
          error: "Todos os campos são obrigatórios.",
          firstName,
          lastName,
          email,
        })
      }

      email = String(email).trim().toLowerCase()

      if (password !== confirmPassword) {
        return res.render("auth/register", {
          error: "As senhas não coincidem!",
          firstName,
          lastName,
          email,
        })
      }

      if (String(password).length < 8) {
        return res.render("auth/register", {
          error: "A senha deve ter pelo menos 8 caracteres.",
          firstName,
          lastName,
          email,
        })
      }

      // Verifica se o e-mail já está cadastrado
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        return res.render("auth/register", { error: "Usuário já cadastrado!" })
      }

      // Criar um novo usuário
      const newUser = new User({
        firstName,
        lastName,
        email,
        password, // A senha será criptografada no model com o middleware
        authProvider: "local",
      })

      // Salvar o usuário no banco de dados
      await newUser.save()

      // Agora que o usuário foi registrado, vamos logá-lo automaticamente
      req.session.loggedUser = {
        _id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      }

      // Garante que a sessão seja salva antes do redirect
      console.log(
        `[auth] register - before save sessionID=${req.sessionID} keys=${Object.keys(req.session || {})}`
      )
      req.session.save(() => {
        console.log(
          `[auth] register - after save sessionID=${req.sessionID} keys=${Object.keys(req.session || {})}`
        )
        // redireciona após garantir que a sessão foi persistida
        res.redirect("/auth/dashboard")
      })
    } catch (error) {
      console.error("Erro ao cadastrar usuário:", error)
      res
        .status(500)
        .render("/auth/register", { error: "Erro ao cadastrar usuário" })
    }
  },

  // Processar o logout do usuário
  logout: (req, res) => {
    req.session.destroy(() => {
      res.redirect("/")
    })
  },
}

module.exports = AuthController
