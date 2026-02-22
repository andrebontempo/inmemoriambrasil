/**
 * Impede o acesso ao site (exceto admin e rotas de login) durante manutenção.
 */
function MaintenanceMiddleware(req, res, next) {
    const emManutencao = String(process.env.MAINTENANCE).toLowerCase() === "true"

    if (!emManutencao) return next()

    const user = req.user // Passport popula req.user diretamente
    if (user && user.role === "admin") return next()

    const rotasLiberadas = ["/auth/login", "/auth/logout", "/auth/google"]
    if (rotasLiberadas.includes(req.path)) return next()

    res.status(503).render("alerts/manutencao")
}

module.exports = MaintenanceMiddleware
