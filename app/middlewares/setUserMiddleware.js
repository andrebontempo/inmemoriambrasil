module.exports = (req, res, next) => {
  // Disponível para controladores
  req.user = req.session.user || null

  // Disponível nas views
  res.locals.user = req.session.user || null

  next()
}
