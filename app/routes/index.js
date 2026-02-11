const express = require("express")
const router = express.Router()

// Importa as rotas modulares
const homeRoutes = require("./homeRoutes")
const authRoutes = require("./authRoutes")
const memorialRoutes = require("./memorialRoutes")

// Usa as rotas nos caminhos apropriados
router.use("/", homeRoutes) // para exibição da página inicial
router.use("/auth", authRoutes) // para autenticação e registro de usuários
router.use("/memorial", memorialRoutes) //para exibição dos memoriais

// Rota para páginas não encontradas (ERRO 404)
router.use((req, res) => {
  res
    .status(404)
    .render("errors/404", { title: "Página Não Encontrada", layout: "main" })
})

module.exports = router
