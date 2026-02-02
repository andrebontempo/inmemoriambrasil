function canEditMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  // Se não está logado → bloqueia
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ error: "Login necessário" })
  }

  // Admin sempre pode
  if (user.role === "admin") return next()

  // Dono
  if (String(memorial.owner) === String(user._id)) return next()

  // Colaborador
  if (memorial.collaborators?.some((c) => String(c) === String(user._id)))
    return next()

  return res.status(403).json({ error: "Sem permissão para editar" })
}

module.exports = canEditMemorial
