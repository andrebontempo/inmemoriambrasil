function canViewMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  if (!memorial) {
    return res.status(500).json({
      error: "Memorial não carregado (middleware loadMemorial ausente)"
    })
  }

  if (memorial.accessLevel === "public_read") return next()

  if (!user) {
    return res.status(401).json({ error: "Login necessário" })
  }

  if (user.role === "admin") return next()
  if (String(memorial.owner) === String(user._id)) return next()
  if (memorial.collaborators.includes(user._id)) return next()

  if (memorial.accessLevel === "private_read") return next()

  return res.status(403).json({ error: "Sem permissão para visualizar" })
}

module.exports = canViewMemorial
