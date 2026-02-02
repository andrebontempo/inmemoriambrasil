function canViewMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  if (!memorial) {
    return res.status(500).json({
      error: "Memorial não carregado (middleware loadMemorial ausente)"
    })
  }

  // Público: qualquer um
  if (memorial.accessLevel === "public_read") {
    return next()
  }

  // A partir daqui, convidados e relações explícitas
  if (!user) {
    return res.status(401).json({ error: "Login necessário" })
  }

  // Admin vê tudo
  if (user.role === "admin") {
    return next()
  }

  const userId = String(user._id)

  // Owner
  if (String(memorial.owner) === userId) {
    return next()
  }

  // Collaborator
  if (memorial.collaborators?.some(id => String(id) === userId)) {
    return next()
  }

  // Invited → SOMENTE private_read
  if (
    memorial.accessLevel === "private_read" &&
    memorial.invited?.some(id => String(id) === userId)
  ) {
    return next()
  }

  return res.status(403).json({ error: "Sem permissão para visualizar" })
}

module.exports = canViewMemorial
