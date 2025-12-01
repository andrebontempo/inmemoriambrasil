function ensureAuth(req, res, next) {
  // Passport preenche req.isAuthenticated()
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next()
  }

  return res.status(401).json({ error: "Login necessário" })
}

module.exports = ensureAuth
