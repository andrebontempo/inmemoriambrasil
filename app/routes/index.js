const express = require("express")
const router = express.Router()

// Importa as rotas modulares
const homeRoutes = require("./homeRoutes")
const authRoutes = require("./authRoutes")
const memorialRoutes = require("./memorialRoutes")
//const tributeRoutes = require("./tributeRoutes")
//const lifeStoryRoutes = require("./lifeStoryRoutes")
//const sharedStoryRoutes = require("./sharedStoryRoutes")
//const galleryRoutes = require("./galleryRoutes")

// Usa as rotas nos caminhos apropriados
router.use("/", homeRoutes) // para exibição da página inicial
router.use("/auth", authRoutes) // para autenticação e registro de usuários
router.use("/memorial", memorialRoutes) //para exibição de tributos e histórias de vida e History e gallery
//router.use("/tribute", tributeRoutes) // para exibição de tributos
//router.use("/lifestory", lifeStoryRoutes) // para exibição de histórias de vida
//router.use("/sharedstory", sharedStoryRoutes) // para exibição de histórias compartilhadas
//router.use("/gallery", galleryRoutes) // para exibição de galerias

// Rota para páginas não encontradas (ERRO 404)
router.use((req, res) => {
  res
    .status(404)
    .render("errors/404", { title: "Página Não Encontrada", layout: "main" })
})

module.exports = router
