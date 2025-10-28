const express = require("express")
const router = express.Router()
const AuthController = require("../controllers/AuthController")
const authMiddleware = require("../middlewares/authMiddleware")

// Rotas de Autenticação
router.get("/register", AuthController.showRegisterForm) // Rota para exibir o formulário de cadastro
router.post("/register", AuthController.registerUser) // Rota para processar o cadastro
router.get("/login", AuthController.showLoginForm) // Rota para exibir o formulário de login
router.post("/login", AuthController.loginUser) // Rota para processar o login
//router.get("/forgot-password", AuthController.showForgotPasswordForm) // Rota para exibir o formulário de recuperação de senha
//router.post("/forgot-password", AuthController.forgotPassword) // Rota para processar a recuperação de senha
router.get("/dashboard", AuthController.showDashboard) // Rota para exibir o painel do usuário autenticado
/*
router.get("/dashboard", authMiddleware, (req, res) => {
  res.render("auth/dashboard", { user: req.session.loggedUser })
})
*/
router.get("/logout", AuthController.logout)

module.exports = router
