function isAdmin(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === "admin") {
      return next()
    }
  }

  return res.status(403).json({ error: "Acesso de administrador necessário" })
}

module.exports = isAdmin
