const Gallery = require("../models/Gallery")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const fs = require("fs")
const path = require("path")
const Memorial = require("../models/Memorial")
const moment = require("moment-timezone")

const GalleryController = {
  // Exibir galeria de um memorial
  showGallery: async (req, res) => {
    const { slug } = req.params

    //console.log("ESTOU EM EXIBIR GALERIA - Slug recebido:", slug)
    try {
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "user", select: "firstName lastName" })
        .populate({ path: "lifeStory", select: "title content eventDate" }) // Populate para lifeStory
        .populate({ path: "sharedStory", select: "title content" }) // Populate para sharedStory
        //.populate({ path: "gallery.photos", select: "filename" }) // Populate para fotos da galeria
        //.populate({ path: "gallery.audios", select: "filename" }) // Populate para áudios da galeria
        //.populate({ path: "gallery.videos", select: "filename" }) // Populate para vídeos da galeria
        .lean() // Converte o documento em um objeto simples

      if (!memorial) {
        return res.status(404).render("errors/404", {
          message: "Memorial não encontrado.",
        })
      }

      // Buscar as photos relacionados ao memorial
      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .populate({ path: "user", select: "firstName lastName" })
        .select("photos audios videos")
        .lean() // Garantir que o resultado seja simples (não um documento Mongoose)

      const galleryData = galeria || {
        photos: [],
        audios: [],
        videos: [],
      }

      // Buscar contagem de tributos (caso tenha múltiplas associadas a esse memorial)
      const totalTributos = await Tribute.countDocuments({
        memorial: memorial._id,
      })
      // Buscar contagem de histórias de vida (caso tenha múltiplas associadas a esse memorial)
      const totalHistorias = await LifeStory.countDocuments({
        memorial: memorial._id,
      })
      // Buscar contagem de histórias compartilhadas (caso tenha múltiplas associadas a esse memorial)
      const totalHistoriasCom = await SharedStory.countDocuments({
        memorial: memorial._id,
      })

      //console.log("Galeria:", galeria)

      res.render("memorial/memorial-gallery", {
        layout: "memorial-layout",
        slug: memorial.slug,
        id: memorial._id,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        gender: memorial.gender,
        kinship: memorial.kinship,
        mainPhoto: memorial.mainPhoto,
        birth: memorial.birth,
        death: memorial.death,
        gallery: galleryData,
        theme: memorial.theme,
        // Envia estatísticas específicas para a view
        estatisticas: {
          totalVisitas: memorial.visits || 0,
          totalTributos,
          totalHistorias,
          totalHistoriasCom,
        },
        user: {
          firstName: memorial.user?.firstName || "Nome não informado",
          lastName: memorial.user?.lastName || "Sobrenome não informado",
        },
      })
    } catch (error) {
      console.error("Erro ao exibir galeria:", error)
      return res.status(500).render("errors/500", {
        message: "Erro ao exibir galeria.",
      })
    }
  },

  // Editar galeria de um memorial
  editGallery: async (req, res) => {
    const { id } = req.params
    const userCurrent = req.session.loggedUser
    //console.log("ESTOU EM Edit GALERIA - ID recebido:", id)

    try {
      const memorial = await Memorial.findOne({ _id: id })
        .populate({ path: "user", select: "firstName lastName" })
        .populate({ path: "lifeStory", select: "title content eventDate" }) // Populate para lifeStory
        .populate({ path: "sharedStory", select: "title content" }) // Populate para sharedStory
        .populate({ path: "gallery.photos", select: "url" }) // Populate para fotos da galeria
        .populate({ path: "gallery.audios", select: "url" }) // Populate para áudios da galeria
        .populate({ path: "gallery.videos", select: "url" }) // Populate para vídeos da galeria
        .lean() // Converte o documento em um objeto simples

      if (!memorial) {
        return res.status(404).render("errors/404", {
          message: "Memorial não encontrado.",
        })
      }
      //console.log("Memorial encontrado:", memorial)

      // Buscar as photos relacionados ao memorial
      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .populate({ path: "user", select: "firstName lastName" })
        .select("photos audios videos")
        .lean() // Garantir que o resultado seja simples (não um documento Mongoose)

      const galleryData = galeria || {
        photos: [],
        audios: [],
        videos: [],
      }

      //console.log("Galeria:", galeria)

      res.render("memorial/edit/gallery", {
        layout: "memorial-layout",
        user: userCurrent._id,
        slug: memorial.slug,
        id: memorial._id,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        gender: memorial.gender,
        kinship: memorial.kinship,
        mainPhoto: memorial.mainPhoto,
        birth: memorial.birth,
        death: memorial.death,
        gallery: galleryData,
        theme: memorial.theme,
        user: {
          firstName: memorial.user?.firstName || "Nome não informado",
          lastName: memorial.user?.lastName || "Sobrenome não informado",
        },
      })
    } catch (error) {
      console.error("Erro ao exibir galeria:", error)
      return res.status(500).render("errors/500", {
        message: "Erro ao exibir galeria.",
      })
    }
  },
  uploadGallery: (req, res) => {
    // Verificar se o arquivo foi enviado
    //console.log("ESTOU EM UPDATE GALERIA - Slug recebido:", req.params.slug)
    const { slug } = req.params
    const userCurrent = req.session.loggedUser
    if (!req.file) {
      return res.status(400).send("Nenhum arquivo enviado.")
    }

    // Se o arquivo foi enviado, retornamos a mensagem de sucesso
    //res.send("Arquivo enviado com sucesso: " + req.file.filename)
    res.redirect(`/memorial/${slug}/gallery`)
  },

  // Upload de arquivos na galeria

  updateGallery: async (req, res) => {
    //console.log("ESTOU EM UPDATE GALERIA - Slug recebido:", req.params.slug)
    const { slug, tipo } = req.params
    const file = req.file
    const userCurrent = req.session.loggedUser

    //console.log("Slug:", slug)
    //console.log("Tipo:", tipo)
    //console.log("Arquivo recebido:", req.file)

    // Verifica se o arquivo foi enviado
    if (!file) return res.status(400).send("Nenhum arquivo enviado")

    try {
      const memorial = await Memorial.findOne({ slug })
      if (!memorial) return res.status(404).send("Memorial não encontrado")

      // Localiza a galeria existente ou cria uma nova
      let gallery = await Gallery.findOne({ memorial: memorial._id })

      if (!gallery) {
        gallery = new Gallery({
          memorial: memorial._id,
          user: userCurrent._id,
          //user: req.body.userId, // ou quem está logado
          photos: [],
          audios: [],
          videos: [],
        })
      }

      // Insere no array correto conforme o tipo
      const fileName = file.filename

      if (tipo === "photo") {
        gallery.photos.push({
          filename: fileName,
          uploadedBy: userCurrent._id,
        })
      } else if (tipo === "audio") {
        gallery.audios.push({
          filename: fileName,
          uploadedBy: userCurrent._id,
        })
      } else if (tipo === "video") {
        gallery.videos.push({
          filename: fileName,
          uploadedBy: userCurrent._id,
        })
      } else {
        return res.status(400).send("Tipo de mídia inválido.")
      }

      await gallery.save()

      res.redirect(`/memorial/${slug}/gallery`)
    } catch (error) {
      console.error("Erro ao fazer upload:", error)
      res.status(500).render("errors/500")
    }
  },

  // Deletar um arquivo da galeria
  deleteFile: async (req, res) => {
    const { slug, tipo } = req.params
    const { fileName } = req.body

    const tipoPasta =
      tipo === "photo"
        ? "photos"
        : tipo === "audio"
          ? "audios"
          : tipo === "video"
            ? "videos"
            : null

    if (!tipoPasta) return res.status(400).send("Tipo inválido")

    try {
      const memorial = await Memorial.findOne({ slug })
      if (!memorial) return res.status(404).send("Memorial não encontrado")

      const gallery = await Gallery.findOne({ memorial: memorial._id }) // <- aqui
      if (!gallery) return res.status(404).send("Galeria não encontrada")

      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "memorials",
        slug,
        tipoPasta,
        fileName
      )

      //console.log("Caminho final:", filePath)
      //console.log("Arquivo existe?", fs.existsSync(filePath))

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

      // Remover do array correto
      if (tipo === "photo")
        gallery.photos = gallery.photos.filter((f) => f.filename !== fileName)
      else if (tipo === "audio")
        gallery.audios = gallery.audios.filter((a) => a.filename !== fileName)
      else if (tipo === "video")
        gallery.videos = gallery.videos.filter((v) => v.filename !== fileName)

      await gallery.save()

      res.redirect(`/memorial/${slug}/gallery`)
    } catch (error) {
      console.error("Erro ao deletar arquivo:", error)
      res.status(500).render("errors/500")
    }
  },
}

module.exports = GalleryController
