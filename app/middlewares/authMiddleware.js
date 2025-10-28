module.exports = function authMiddleware(req, res, next) {
  //console.log("🔐 Entrou no authMiddleware")
  //console.log("Sessão atual:", req.session)

  if (req.session && req.session.loggedUser) {
    //console.log("✅ Usuário autenticado:", req.session.loggedUser.email)
    return next()
  }

  //console.log("❌ Usuário não autenticado. Redirecionando...", req.originalUrl)
  req.session.redirectAfterLogin = req.originalUrl // salva o caminho desejado
  res.redirect("/auth/login")
}
