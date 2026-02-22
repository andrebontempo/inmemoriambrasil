const express = require("express")
const router = express.Router()
const HomeController = require("../controllers/HomeController")
const AuthMiddleware = require("../middlewares/AuthMiddleware")
const StatsController = require("../controllers/StatsController")
const EnvioContatoController = require("../controllers/EnvioContatoController")

const AdminMiddleware = require("../middlewares/AdminMiddleware")
const AccountsController = require("../controllers/AccountsController")
const AdminController = require("../controllers/AdminController")



// Rota para o controle de Usuários
router.get("/admin", AdminMiddleware, AdminController.index)
router.get("/admin/accounts", AdminMiddleware, AccountsController.list)
router.get("/admin/accounts/edit/:id", AdminMiddleware, AccountsController.editForm)
router.post("/admin/accounts/edit/:id", AdminMiddleware, AccountsController.update)
router.post("/admin/accounts/delete/:id", AdminMiddleware, AccountsController.delete)
// Rota para logs
router.get("/admin/accounts/logs", AdminMiddleware, AccountsController.logs)

// Rota para gestão de memoriais
router.get("/admin/memorials", AdminMiddleware, AdminController.listMemoriais)



// Rota raiz do site
router.get("/", HomeController.index)

// Rota para estatísticas
router.get("/admin/dashboard", AdminMiddleware, StatsController.getStatistics)

// Rotas estáticas
router.get("/sobre", (req, res) => {
  res.render("statics/sobre", {
    title: "Sobre Nós - In Memoriam Brasil",
    activeSobre: true,
  })
})
router.get("/manutencao", (req, res) => {
  res.status(503).render("manutencao")
})
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
// Rota para envio de formulário de contato
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
router.get("/faq", (req, res) => {
  res.render("statics/faq", {
    title: "Perguntas e Respostas - In Memoriam Brasil",
  })
})
router.get("/tutorial", (req, res) => {
  res.render("statics/tutorial", {
    title: "Tutorial - In Memoriam Brasil",
  })
})

module.exports = router
