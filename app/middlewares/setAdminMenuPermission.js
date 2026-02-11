function setAdminMenuPermission(req, res, next) {
  const memorial = req.memorial
  const user = req.user

  res.locals.canAdminMenu = false // padrão: não mostra

  if (!memorial || !user) {
    return next()
  }

  // Admin global
  if (user.role === "admin") {
    res.locals.canAdminMenu = true
    return next()
  }

  const userId = String(user._id)

  // Owner
  if (String(memorial.owner) === userId) {
    res.locals.canAdminMenu = true
    return next()
  }

  // Collaborator
  if (memorial.collaborators?.some(id => String(id) === userId)) {
    res.locals.canAdminMenu = true
  }

  next()
}

module.exports = setAdminMenuPermission
