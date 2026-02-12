function requireGlobalAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).render("alerts/login_required")
    }

    if (req.user.role !== "admin") {
        return res.status(403).render("alerts/forbidden")
    }

    next()
}

module.exports = requireGlobalAdmin
