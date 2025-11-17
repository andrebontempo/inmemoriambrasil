const express = require("express")
const session = require("express-session")
const MongoStore = require("connect-mongo")

require("dotenv").config()
const isProduction = process.env.NODE_ENV === "production"
const app = express()

app.set("trust proxy", isProduction)

const cookieOptions = {
  maxAge: 1000 * 60 * 60 * 24 * 7,
  secure: isProduction,
  sameSite: isProduction ? "lax" : "lax",
  httpOnly: true,
}

app.use(
  session({
    name: process.env.SESSION_NAME || "connect.sid",
    secret: process.env.SESSION_SECRET || "repro-secret",
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGO_URI || "mongodb://127.0.0.1:27017/repro-sessions",
      ttl: 60 * 60 * 24 * 7,
    }),
    cookie: cookieOptions,
  })
)

// Ensure cookie.secure is set per-request depending on req.secure or X-Forwarded-Proto
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
    // ignore
  }
  next()
})

app.get("/set-session", (req, res) => {
  req.session.foo = "bar"
  req.session.save(() => {
    console.log("[repro] session saved id=", req.sessionID)
    res.send("ok")
  })
})

app.get("/check", (req, res) => {
  res.json({
    sessionID: req.sessionID,
    headers_set_cookie: res.getHeader && res.getHeader("set-cookie"),
    hasSession: !!req.session.foo,
  })
})

const PORT = process.env.PORT || 4001
app.listen(PORT, () =>
  console.log(
    `repro server listening on ${PORT}; NODE_ENV=${process.env.NODE_ENV}`
  )
)
