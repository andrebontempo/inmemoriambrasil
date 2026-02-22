const express = require("express")
const exphbs = require("express-handlebars")
const path = require("path")
const conectarDB = require("./config/db")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const passport = require("passport")
const helpers = require("./app/utils/helpers")
require("dotenv").config()
const MaintenanceMiddleware = require("./app/middlewares/MaintenanceMiddleware")
const routes = require("./app/routes")

// Configuração do Passport (estratégias Local + Google)
require("./config/passport")(passport)

const app = express()

// Ambiente...
const isProduction = process.env.NODE_ENV === "production"

// ----- Validações essenciais -----
if (!process.env.MONGO_URI) {
  console.error("❌ ERRO: MONGO_URI não definida.")
  process.exit(1)
}
if (!process.env.SESSION_SECRET) {
  console.error("❌ ERRO: SESSION_SECRET não definida.")
  process.exit(1)
}

// ----- Conexão com MongoDB -----
conectarDB()

// ----- Middlewares Básicos -----
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(express.static(path.join(__dirname, "public")))

app.set("trust proxy", isProduction)

app.use(
  session({
    name: process.env.SESSION_NAME || "connect.sid",
    secret: process.env.SESSION_SECRET,

    resave: false,
    saveUninitialized: false,

    rolling: true, // 🔑 reinicia o tempo a cada request

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      ttl: 60 * 30, // 30 minutos (em segundos)
      touchAfter: 60, // atualiza no banco no máximo a cada 1 min
    }),

    cookie: {
      maxAge: 1000 * 60 * 30, // 30 minutos
      secure: isProduction, // Em produção (HTTPS) é true, em dev (HTTP) é false
      sameSite: "lax",
      httpOnly: true,
    },
  })
)

// ----- Passport -----
app.use(passport.initialize())
app.use(passport.session())

// ----- Flash Messages --------
app.use(flash())
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg")
  res.locals.error_msg = req.flash("error_msg")
  next()
})

// Disponibiliza o usuário logado para todas as views
app.use((req, res, next) => {
  res.locals.user = req.user || null
  next()
})

// ----- View Engine -----
const hbs = exphbs.create({
  defaultLayout: "main",
  extname: "hbs",
  layoutsDir: path.join(__dirname, "app/views/layouts"),
  partialsDir: [
    path.join(__dirname, "app/views/partials/main"),
    path.join(__dirname, "app/views/partials/memorial"),
  ],
  helpers,
  cache: isProduction,
})

app.engine(".hbs", hbs.engine)
app.set("view engine", ".hbs")
app.set("views", path.join(__dirname, "app/views"))

// ----- Modo Manutenção -----
app.use(MaintenanceMiddleware)
app.use("/", routes) //

// ----- Handler de Erro -----
app.use((err, req, res, next) => {
  console.error("Erro:", err)

  res.status(500).render("error", {
    title: "Erro no Servidor",
    message: "Ocorreu um erro inesperado.",
    layout: "main",
  })
})

// ----- Iniciar Servidor -----
const PORT = process.env.PORT || 8080
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`)
})
