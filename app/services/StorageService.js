const Memorial = require("../models/Memorial")
const slugify = require("slugify")
const fs = require("fs")
const path = require("path")
const { uploadToR2, deleteFromR2, publicURL } = require("../services/R2Service")
const { getMediaFolder } = require("../middlewares/uploadMiddleware")

// =============================
// CRIAÇÃO (ETAPA 1)
// =============================
exports.createStep1 = async (req, res) => {
  try {
    const { name, birthDate, deathDate } = req.body

    const slug = slugify(name, { lower: true, strict: true })

    const existing = await Memorial.findOne({ slug })
    if (existing) {
      return res.status(400).json({ error: "Nome já utilizado, tente outro." })
    }

    const memorial = await Memorial.create({
      name,
      birthDate,
      deathDate,
      slug,
      step: 1,
    })

    return res.json({ memorial })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// =============================
// ETAPA 2 - informações
// =============================
exports.createStep2 = async (req, res) => {
  try {
    const { slug } = req.params
    const data = req.body

    const memorial = await Memorial.findOneAndUpdate(
      { slug },
      { ...data, step: 2 },
      { new: true }
    )

    return res.json({ memorial })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// =============================
// ETAPA 3 - mensagens, textos, etc
// =============================
exports.createStep3 = async (req, res) => {
  try {
    const { slug } = req.params
    const data = req.body

    const memorial = await Memorial.findOneAndUpdate(
      { slug },
      { ...data, step: 3 },
      { new: true }
    )

    return res.json({ memorial })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// =============================
// ETAPA 4 - Upload da FOTO PRINCIPAL (AGORA NO R2)
// =============================
exports.createStep4 = async (req, res) => {
  try {
    const { slug } = req.params
    const memorial = await Memorial.findOne({ slug })

    if (!memorial)
      return res.status(404).json({ error: "Memorial não encontrado." })

    const updateData = { step: 4 }

    if (req.file) {
      const folder = getMediaFolder(req.file.mimetype)

      // Apaga antiga no R2
      if (memorial.mainPhoto?.key) {
        await deleteFromR2(memorial.mainPhoto.key)
      }

      // Faz upload para R2
      const key = await uploadToR2(
        req.file.buffer,
        req.file.mimetype,
        folder,
        slug
      )

      // Atualiza o campo no banco
      updateData.mainPhoto = {
        key,
        url: publicURL(key),
        originalName: req.file.originalname,
        updatedAt: new Date(),
      }
    }

    const updated = await Memorial.findOneAndUpdate({ slug }, updateData, {
      new: true,
    })

    return res.json({ memorial: updated })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// =============================
// DELETAR MEMORIAL + FOTO PRINCIPAL NO R2
// =============================
exports.deleteMemorial = async (req, res) => {
  try {
    const { slug } = req.params
    const memorial = await Memorial.findOne({ slug })

    if (!memorial) {
      return res.status(404).json({ error: "Memorial não encontrado." })
    }

    // Apagar arquivos principais no R2
    if (memorial.mainPhoto?.key) {
      await deleteFromR2(memorial.mainPhoto.key)
    }

    // TODO: depois podemos apagar galeria (se desejar)

    await memorial.deleteOne()

    return res.json({ message: "Memorial excluído com sucesso" })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// =============================
// GET
// =============================
exports.get = async (req, res) => {
  try {
    const memorial = await Memorial.findOne({ slug: req.params.slug })
    if (!memorial)
      return res.status(404).json({ error: "Memorial não encontrado." })
    return res.json({ memorial })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
