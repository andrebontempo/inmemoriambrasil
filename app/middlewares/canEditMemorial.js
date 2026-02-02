function canEditMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  if (!user) {
    return res.status(401).json({ error: "Login necessário" })
  }

  if (user.role === "admin") {
    return next()
  }

  const userId = String(user._id)

  if (String(memorial.owner) === userId) {
    return next()
  }

  if (memorial.collaborators?.some(id => String(id) === userId)) {
    return next()
  }

  return res.status(403).json({ error: "Sem permissão para editar" })
}
