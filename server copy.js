const express = require("express")
const exphbs = require("express-handlebars")
const path = require("path")
const conectarDB = require("./config/db")
const session = require("express-session")
const MongoStore = require("connect-mongo")
const flash = require("connect-flash")
const setUserMiddleware = require("./app/middlewares/setUserMiddleware")
require("dotenv").config()
// Ambiente
const isProduction = process.env.NODE_ENV === "production"

// Validações básicas de variáveis de ambiente em produção
if (isProduction && !process.env.MONGO_URI) {
  console.error(
    "❌ MONGO_URI não está definida. Abortando startup em produção."
  )
  process.exit(1)
}
if (isProduction && !process.env.SESSION_SECRET) {
  console.error(
    "❌ SESSION_SECRET não está definida em produção. Abortando startup."
  )
  process.exit(1)
}
if (!isProduction && !process.env.SESSION_SECRET) {
  console.warn(
    "⚠️ SESSION_SECRET não definida — usando fallback local. Não use isso em produção."
  )
}
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
// cookie-parser (usado para parsing e assinatura de cookies quando aplicável)
// (cookie-parser removido) - usando apenas express-session + connect-mongo
//app.use(express.json({ limit: "500mb" }))
//app.use(express.urlencoded({ limit: "500mb", extended: true }))
app.use(express.static(path.join(__dirname, "public")))

// Configuração de Sessão
// Options de cookie para diferentes ambientes
const cookieOptions = {
  maxAge: 1000 * 60 * 60 * 24 * 7, // cookie 7 dias
  secure: isProduction, // somente via HTTPS em produção
  sameSite: isProduction ? "lax" : "lax",
  httpOnly: true,
}

app.set("trust proxy", isProduction) // se estiver atrás de proxy (ex: nginx), necessário para cookies secure/trust

// (Removed temporary debug interceptor that logged Set-Cookie)
// The global fallback below is the only temporary workaround kept.

app.use(
  session({
    name: process.env.SESSION_NAME || "connect.sid",
    secret: process.env.SESSION_SECRET || "seuSegredoSuperSeguro",
    resave: false,
    // Em desenvolvimento, permitir saveUninitialized para garantir que o cookie seja enviado
    saveUninitialized: isProduction ? false : true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, // coloque sua URI real
      ttl: 60 * 60 * 24 * 7, // 7 dias
    }),
    cookie: cookieOptions,
  })
)

// Per-request: adjust session cookie `secure` flag depending on the incoming request
// This allows express-session to attach the cookie when the request is effectively secure
// (req.secure or X-Forwarded-Proto) while keeping cookieOptions as a sensible default.
app.use((req, res, next) => {
  try {
    const forwardedProto = (
      req.headers["x-forwarded-proto"] || ""
    ).toLowerCase()
    const secure = req.secure || forwardedProto.includes("https")
    if (req.session && req.session.cookie) {
      req.session.cookie.secure = secure
    }
  } catch (e) {
    // swallow - not critical
  }
  next()
})

// Note: previously we had a global fallback that forcibly attached Set-Cookie
// to responses when express-session didn't. That fallback has been removed.
// We now rely on per-request adjustment of `req.session.cookie.secure` (above)
// so the session middleware can emit cookies correctly depending on whether
// the incoming request is actually secure (req.secure or X-Forwarded-Proto).

// NOTE: rota de teste removida — não deixar rotas de debug em produção
/*
app.use(
  session({
    secret: process.env.SESSION_SECRET || "seuSegredoSuperSeguro",
    resave: false,
    saveUninitialized: false,
  })
)
*/

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

// Ativar/desativar modo manutenção
const emManutencao = false // altere para false quando quiser liberar o site

if (emManutencao) {
  app.get("*", (req, res) => {
    res.status(503).render("manutencao")
  })
} else {
  // Rotas
  const routes = require("./app/routes")
  app.use("/", routes)
}

// Rotas
//const routes = require("./app/routes")
//app.use("/", routes)

// Middleware de erro (corrigido para evitar erro 500)
app.use((err, req, res, next) => {
  // Log com mais contexto para facilitar depuração
  try {
    console.error(
      `[${new Date().toISOString()}] Erro em ${req.method} ${req.originalUrl} - user=${
        req.user ? req.user.id || req.user._id || "autenticado" : "anon"
      }`,
      err
    )
  } catch (logErr) {
    console.error("Erro ao logar o erro original:", logErr)
    console.error("Erro original:", err)
  }

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
