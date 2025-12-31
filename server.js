const express = require("express")
const exphbs = require("express-handlebars")
const path = require("path")
const conectarDB = require("./config/db")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const setUserMiddleware = require("./app/middlewares/setUserMiddleware")
const helpers = require("./app/utils/helpers")
require("dotenv").config()
const maintenanceMiddleware = require("./app/middlewares/maintenance")
const routes = require("./app/routes")

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
      secure: isProduction,
      sameSite: "lax",
      httpOnly: true,
    },
  })
)
// Ajusta secure conforme HTTPS real (via proxy)
app.use((req, res, next) => {
  const forwardedProto = (req.headers["x-forwarded-proto"] || "").toLowerCase()
  const isSecure = req.secure || forwardedProto.includes("https")
  if (req.session?.cookie) req.session.cookie.secure = isSecure
  next()
})

// ----- Flash Messages ------
app.use(flash())
app.use((req, res, next) => {
  res.locals.success_msg = req.flash("success_msg")
  res.locals.error_msg = req.flash("error_msg")
  next()
})

// Middleware de usuário logado
app.use(setUserMiddleware)

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
app.use(maintenanceMiddleware)
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
