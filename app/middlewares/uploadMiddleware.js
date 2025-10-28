const multer = require("multer")
const path = require("path")
const fs = require("fs")

// Função auxiliar para identificar o tipo de mídia
function getMediaFolder(mimetype) {
  if (mimetype.startsWith("image/")) return "photos"
  if (mimetype.startsWith("audio/")) return "audios"
  if (mimetype.startsWith("video/")) return "videos"
  return "others"
}

// Configuração de armazenamento dinâmica
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const slug = req.body.slug || req.params.slug

    if (!slug) {
      return cb(new Error("Slug não fornecido."))
    }

    const mediaFolder = getMediaFolder(file.mimetype)
    const uploadPath = path.join(
      __dirname,
      "..",
      "..",
      "public",
      "memorials",
      slug,
      mediaFolder
    )

    // Cria diretório com tratamento de erro
    try {
      fs.mkdirSync(uploadPath, { recursive: true })
      cb(null, uploadPath)
    } catch (err) {
      cb(new Error(`Falha ao criar diretório: ${err.message}`))
    }
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname)
    const filename = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}${ext}`
    cb(null, filename)
  },
})

// Filtro para tipos de arquivo permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "video/mp4",
    "video/webm",
    "video/ogg",
  ]

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Tipo de arquivo não suportado"), false)
  }
}

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
})

// Middleware para tratamento de erros do Multer
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Arquivo muito grande (máx. 50MB)" })
    }
    return res.status(400).json({ error: err.message })
  } else if (err) {
    return res.status(400).json({ error: err.message })
  }
  next()
}

module.exports = upload
