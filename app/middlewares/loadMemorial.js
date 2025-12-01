const Memorial = require("../models/Memorial")

async function loadMemorial(req, res, next) {
  try {
    const id = req.params.id || req.body.memorialId

    if (!id) {
      return res.status(400).json({ error: "ID do memorial não fornecido" })
    }

    const memorial = await Memorial.findById(id)

    if (!memorial) {
      return res.status(404).json({ error: "Memorial não encontrado" })
    }

    req.memorial = memorial
    next()
  } catch (err) {
    console.error("Erro ao carregar memorial:", err)
    return res.status(500).json({ error: "Erro interno" })
  }
}

module.exports = loadMemorial
