module.exports = function maintenanceMiddleware(req, res, next) {
  const emManutencao = String(process.env.MAINTENANCE).toLowerCase() === "true"

  // Se não está em manutenção, segue normal
  if (!emManutencao) {
    return next()
  }

  const user = req.session?.user
  const isAdmin = user && user.role === "admin"

  // Admin passa normalmente
  if (isAdmin) {
    return next()
  }

  // Rotas que ficam liberadas mesmo em manutenção
  const rotasLiberadas = ["/auth/login", "/auth/logout"]

  if (rotasLiberadas.includes(req.path)) {
    return next()
  }

  // Bloqueia todo o resto
  return res.status(503).render("alerts/manutencao")
}
