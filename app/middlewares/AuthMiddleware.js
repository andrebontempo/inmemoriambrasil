/**
 * Middleware para garantir que o usuário está autenticado.
 */
function AuthMiddleware(req, res, next) {
    if (req.isAuthenticated()) {
        return next()
    }

    // Se for uma requisição AJAX/API, retorna 401. Senão redireciona para login.
    if (req.xhr || (req.headers.accept && req.headers.accept.includes("json"))) {
        return res.status(401).json({ error: "Login necessário" })
    }

    req.session.redirectAfterLogin = req.originalUrl
    res.redirect("/auth/login")
}

module.exports = AuthMiddleware
