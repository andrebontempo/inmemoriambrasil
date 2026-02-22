/**
 * Middleware para garantir que o usuário é um administrador.
 */
function AdminMiddleware(req, res, next) {
    const isAuth = req.isAuthenticated()

    if (isAuth && req.user && req.user.role === "admin") {
        return next()
    }

    const isApi = req.xhr || (req.headers.accept && req.headers.accept.includes("json"))

    if (!isAuth) {
        if (isApi) {
            return res.status(401).json({ error: "Login necessário" })
        }
        return res.status(401).render("alerts/login_required")
    }

    // Se chegou aqui, está logado mas não é admin
    if (isApi) {
        return res.status(403).json({ error: "Acesso de administrador necessário" })
    }

    res.status(403).render("alerts/forbidden")
}

module.exports = AdminMiddleware
