const Memorial = require("../models/Memorial")

async function loadMemorial(req, res, next) {
  try {
    const { slug } = req.params

    if (!slug) {
      return res.status(400).json({
        error: "Slug do memorial não fornecido"
      })
    }

    const memorial = await Memorial.findOne({ slug })

    if (!memorial) {
      return res.status(404).json({
        error: "Memorial não encontrado"
      })
    }

    req.memorial = memorial
    next()
  } catch (error) {
    console.error("Erro no loadMemorial:", error)
    return res.status(500).json({
      error: "Erro ao carregar memorial"
    })
  }
}

module.exports = loadMemorial
