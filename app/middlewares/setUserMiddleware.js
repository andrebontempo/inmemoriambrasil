module.exports = (req, res, next) => {
  res.locals.loggedUser = req.session.loggedUser || null // Define `loggedUser` globalmente para todas as views
  next()
}
