const multer = require("multer")
const path = require("path")
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3")

// Configura cliente Cloudflare R2
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
})

// Auxiliar
function getMediaFolder(mimetype) {
  if (mimetype.startsWith("image/")) return "photos"
  if (mimetype.startsWith("audio/")) return "audios"
  if (mimetype.startsWith("video/")) return "videos"
  return "others"
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
})

async function uploadToR2(req, res, next) {
  const file = req.file
  if (!file) return next()

  try {
    const slug = req.body.slug || req.params.slug
    if (!slug) throw new Error("Slug não fornecido")

    const folder = getMediaFolder(file.mimetype)
    const ext = path.extname(file.originalname)
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`
    const key = `memorials/${slug}/${folder}/${filename}`

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    )

    // 👇 AGREGA INFORMAÇÕES PARA O CONTROLLER
    req.file.key = key
    req.file.url = `${process.env.R2_PUBLIC_URL}/${key}`

    next()
  } catch (err) {
    return res.status(500).json({
      error: "Erro ao enviar para R2: " + err.message,
    })
  }
}

module.exports = {
  upload,
  uploadToR2,
}
