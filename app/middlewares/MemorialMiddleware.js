const Memorial = require("../models/Memorial")

/**
 * Middleware para carregar o memorial baseado no slug.
 */
async function loadMemorial(req, res, next) {
    try {
        const { slug } = req.params
        if (!slug) return res.status(400).json({ error: "Slug do memorial não fornecido" })

        const memorial = await Memorial.findOne({ slug })
        if (!memorial) return res.status(404).json({ error: "Memorial não encontrado" })

        req.memorial = memorial
        next()
    } catch (error) {
        console.error("❌ Erro no loadMemorial:", error)
        return res.status(500).json({ error: "Erro ao carregar memorial" })
    }
}

/**
 * Verifica se o usuário tem permissão para visualizar o memorial.
 */
function canViewMemorial(req, res, next) {
    const { memorial, user } = req

    if (!memorial) {
        return res.status(500).json({ error: "Memorial não carregado" })
    }

    // Público
    if (memorial.accessLevel === "public_read") {
        return next()
    }

    // Privado/Restrito requer autenticação
    if (!user) {
        return res.status(403).render("alerts/private_memorial")
    }

    // Admin ou Dono
    if (user.role === "admin" || String(memorial.owner) === String(user._id)) {
        return next()
    }

    // Colaborador
    if (memorial.collaborators?.some(id => String(id) === String(user._id))) {
        return next()
    }

    // Convidado (apenas leitura privada)
    if (memorial.accessLevel === "private_read" && memorial.invited?.some(id => String(id) === String(user._id))) {
        return next()
    }

    return res.status(403).render("alerts/private_memorial")
}

/**
 * Verifica se o usuário tem permissão para editar o memorial.
 */
function canEditMemorial(req, res, next) {
    const { memorial, user } = req

    if (!user) return res.status(401).json({ error: "Login necessário" })
    if (user.role === "admin") return next()

    const userId = String(user._id)
    if (String(memorial.owner) === userId || memorial.collaborators?.some(id => String(id) === userId)) {
        return next()
    }

    return res.status(403).json({ error: "Sem permissão para editar" })
}

/**
 * Define se o menu de administração deve ser exibido.
 */
function setAdminMenuPermission(req, res, next) {
    const { memorial, user } = req
    res.locals.canAdminMenu = false

    if (memorial && user) {
        const userId = String(user._id)
        if (user.role === "admin" || String(memorial.owner) === userId || memorial.collaborators?.some(id => String(id) === userId)) {
            res.locals.canAdminMenu = true
        }
    }

    next()
}

module.exports = {
    loadMemorial,
    canViewMemorial,
    canEditMemorial,
    setAdminMenuPermission
}
