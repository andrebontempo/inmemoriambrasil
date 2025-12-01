function canViewMemorial(req, res, next) {
  const memorial = req.memorial
  const user = req.user // pode ser undefined

  // Público
  if (memorial.accessLevel === "public_read") return next()

  // Admin sempre pode
  if (user && user.role === "admin") return next()

  // Dono do memorial
  if (user && String(memorial.owner) === String(user._id)) return next()

  // Colaborador
  if (
    user &&
    memorial.collaborators?.some((c) => String(c) === String(user._id))
  )
    return next()

  // private_read → exige login mas não exige ser colaborador/dono
  if (memorial.accessLevel === "private_read" && user) return next()

  return res
    .status(user ? 403 : 401)
    .json({ error: "Sem permissão para visualizar" })
}

module.exports = canViewMemorial
