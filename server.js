const express = require("express")
const exphbs = require("express-handlebars")
const path = require("path")
const conectarDB = require("./config/db")
const session = require("express-session")
const flash = require("connect-flash")
const setUserMiddleware = require("./app/middlewares/setUserMiddleware")
require("dotenv").config()
//const methodOverride = require("method-override")
const helpers = require("./app/utils/helpers")
const moment = require("moment-timezone")
moment.locale("pt-br")

const app = express()

// Conectar ao banco de dados
conectarDB()

// Middlewares Básicos
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
//app.use(express.json({ limit: "500mb" }))
//app.use(express.urlencoded({ limit: "500mb", extended: true }))
app.use(express.static(path.join(__dirname, "public")))

// Configuração de Sessão
app.use(
  session({
    secret: process.env.SESSION_SECRET || "seuSegredoSuperSeguro",
    resave: false,
    saveUninitialized: false,
  })
)
app.use(flash())

// Middleware para flash messages
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg")
  res.locals.error_msg = req.flash("error_msg")
  next()
})

// Middleware de usuário
app.use(setUserMiddleware)

// Method Override (para PUT/DELETE em formulários)
//app.use(methodOverride("_method"))
// Quando for multipart/form-data (com Multer)
/*
app.use(
  methodOverride(function (req, res) {
    if (req.body && typeof req.body === "object" && "_method" in req.body) {
      return req.body._method
    }
  })
)
*/
// Configuração do Handlebars (mantenha igual)
const hbs = exphbs.create({
  defaultLayout: "main",
  extname: "hbs",
  layoutsDir: path.join(__dirname, "app/views/layouts"),
  partialsDir: [
    path.join(__dirname, "app/views/partials/main"),
    path.join(__dirname, "app/views/partials/memorial"),
  ],
  helpers,
  cache: process.env.NODE_ENV === "production",
})

app.engine(".hbs", hbs.engine)
app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "app/views"))

/*
//log geral de requisições
app.use((req, res, next) => {
  console.log(`📡 Nova requisição: ${req.method} ${req.originalUrl}`)
  next()
})
*/

// Rotas
const routes = require("./app/routes")
app.use("/", routes)

// Middleware de erro (corrigido para evitar erro 500)
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).render("error", {
    title: "Erro no Servidor",
    message: "Ocorreu um erro inesperado",
    layout: "main",
  })
})

// Iniciar servidor
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
