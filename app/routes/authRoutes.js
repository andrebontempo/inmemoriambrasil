const express = require("express")
const router = express.Router()
const passport = require("passport")
const AuthController = require("../controllers/AuthController")
const AuthMiddleware = require("../middlewares/AuthMiddleware")

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

// ========== Google OAuth ==========
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
)

router.get(
    "/google/callback",
    passport.authenticate("google", {
        failureRedirect: "/auth/login",
        failureFlash: "Erro ao fazer login com Google.",
    }),
    (req, res) => {
        const redirectTo = req.session.redirectAfterLogin || "/auth/dashboard"
        delete req.session.redirectAfterLogin
        req.session.save(() => {
            res.redirect(redirectTo)
        })
    }
)

module.exports = router
