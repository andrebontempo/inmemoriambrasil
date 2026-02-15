module.exports = function authMiddleware(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }

  req.session.redirectAfterLogin = req.originalUrl // salva o caminho desejado
  res.redirect("/auth/login")
}
