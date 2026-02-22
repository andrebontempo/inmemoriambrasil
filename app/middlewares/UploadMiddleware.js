const multer = require("multer")
const path = require("path")
const { r2Client, PutObjectCommand } = require("../services/R2Service")

/**
 * Utilitário para determinar a pasta base no R2 baseada no mimetype.
 */
function getMediaFolder(mimetype) {
  if (mimetype.startsWith("image/")) return "photos"
  if (mimetype.startsWith("audio/")) return "audios"
  if (mimetype.startsWith("video/")) return "videos"
  return "others"
}

// Configuração básica do multer (memória)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // Limite de 100MB
})

/**
 * Middleware para realizar o upload de um arquivo direto para o R2.
 */
async function uploadToR2(req, res, next) {
  const file = req.file
  if (!file) return next()

  try {
    const slug = req.body.slug || req.params.slug
    if (!slug) throw new Error("Slug não fornecido para o upload")

    const folder = getMediaFolder(file.mimetype)
    const ext = path.extname(file.originalname)
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`
    const key = `memorials/${slug}/${folder}/${filename}`

    // Envia o comando via r2Client centralizado
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    )

    // Agrega metadados para o controller
    req.file.key = key
    req.file.url = `${process.env.R2_PUBLIC_URL}/${key}`

    next()
  } catch (err) {
    console.error("❌ Erro no UploadMiddleware:", err)
    return res.status(500).json({
      error: "Erro ao processar upload: " + err.message,
    })
  }
}

module.exports = {
  upload,
  UploadToR2: uploadToR2, // Exportando com Nome PascalCase se desejar manter padrão, mas as rotas chamam como uploadToR2. Mantendo ambos ou padronizando.
  uploadToR2
}
