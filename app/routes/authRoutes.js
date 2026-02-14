const express = require("express")
const router = express.Router()
const AuthController = require("../controllers/AuthController")
const authMiddleware = require("../middlewares/authMiddleware")

// Cadastro
router.get("/register", AuthController.showRegisterForm)
router.post("/register", AuthController.registerUser)

// Login
router.get("/login", AuthController.showLoginForm)
router.post("/login", AuthController.loginUser)

// Recuperação de senha
router.get("/forgot-password", AuthController.showForgotPasswordForm)
router.post("/forgot-password", AuthController.forgotPassword)

// Reset com token
router.get("/reset-password/:token", AuthController.showResetPasswordForm)
router.post("/reset-password/:token", AuthController.resetPassword)

// Dashboard
router.get("/dashboard", AuthController.showDashboard)

// Logout
router.get("/logout", AuthController.logout)

module.exports = router
