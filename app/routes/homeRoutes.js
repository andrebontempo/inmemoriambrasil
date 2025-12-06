const express = require("express")
const router = express.Router()
const HomeController = require("../controllers/HomeController")
const authMiddleware = require("../middlewares/authMiddleware")
const StatsController = require("../controllers/StatsController")
const EnvioContatoController = require("../controllers/EnvioContatoController")

// Rota raiz do site
router.get("/", HomeController.index)

// Rota para estatísticas
router.get("/dashboard", StatsController.getStatistics)

// Rotas estáticas
router.get("/sobre", (req, res) => {
  res.render("statics/sobre", {
    title: "Sobre Nós - In Memoriam Brasil",
    activeSobre: true,
  })
})
/*
router.get("/criar-memorial", (req, res) => {
  res.render("statics/criar-memorial", {
    title: "Criar Memorial - In Memoriam Brasil",
  })
})
*/
/*
// Rota para exibir o formulário de criação do memorial
router.get("/criar-memorial", authMiddleware, (req, res) => {
  const formData = req.session.formData || {} // Recupera os dados ou mantém vazio
  delete req.session.formData // Limpa a sessão para evitar reuso indevido

  res.render("statics/criar-memorial", { formData })
})
*/
router.get("/plano-opcoes", (req, res) => {
  res.render("statics/plano-opcoes", {
    title: "Plano e Opções - In Memoriam Brasil",
    activePlanos: true,
  })
})
// Rota comentada (pode ser ativada no futuro)
//router.get("/testemunhos", (req, res) => {
//  res.render("testemunhos", { title: "Testemunhos - In Memoriam Brasil" });
//});
router.get("/contato", (req, res) => {
  res.render("statics/contato", {
    title: "Contato - In Memoriam Brasil",
    activeContato: true,
  })
})
// Rota comentada para envio de formulário de contato
router.post("/contato-envio", EnvioContatoController.envioContato)

router.get("/memoriais-virtuais", (req, res) => {
  res.render("statics/memoriais-virtuais", {
    title: "Memoriais Virtuais - In Memoriam Brasil",
  })
})
router.get("/condicoes-utilizacao", (req, res) => {
  res.render("statics/condicoes-utilizacao", {
    title: "Condições de Utilização - In Memoriam Brasil",
  })
})
router.get("/politica-privacidade", (req, res) => {
  res.render("statics/politica-privacidade", {
    title: "Política de Privacidade - In Memoriam Brasil",
  })
})
router.get("/mapa-site", (req, res) => {
  res.render("statics/mapa-site", {
    title: "Mapa do Site - In Memoriam Brasil",
  })
})

module.exports = router
