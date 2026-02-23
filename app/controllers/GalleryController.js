const Gallery = require("../models/Gallery")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const fs = require("fs")
const path = require("path")
const Memorial = require("../models/Memorial")
const moment = require("moment-timezone")
const { r2Client: r2, PutObjectCommand, DeleteObjectCommand } = require("../services/R2Service")
const { deleteFromR2 } = require("../services/R2Service")

function getFolder(mimetype) {
  if (mimetype.startsWith("image/")) return "photos"
  if (mimetype.startsWith("audio/")) return "audios"
  if (mimetype.startsWith("video/")) return "videos"
  return "others"
}

const GalleryController = {
  // Exibir galeria de um memorial
  showGallery: async (req, res) => {
    const { slug } = req.params

    //console.log("ESTOU EM EXIBIR GALERIA - Slug recebido:", slug)
    try {
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "owner", select: "firstName lastName" })
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

      // Lógica de Permissionamento
      let canManageGallery = false
      const currentUser = req.user

      if (currentUser) {
        const isOwner = memorial.owner && memorial.owner._id.toString() === currentUser._id.toString()
        const isAdmin = currentUser.role === "admin"
        const isCollaborator = memorial.collaborators && memorial.collaborators.some(
          collabId => collabId.toString() === currentUser._id.toString()
        )

        if (isOwner || isAdmin || isCollaborator) {
          canManageGallery = true
        }
      }

      res.render("memorial/memorial-gallery", {
        layout: "memorial-layout",
        slug: memorial.slug,
        id: memorial._id,
        canManageGallery,
        owner: {
          firstName: memorial.owner?.firstName || "",
          lastName: memorial.owner?.lastName || "",
        },
        activeGallery: true,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        gender: memorial.gender,
        kinship: memorial.kinship,
        mainPhoto: memorial.mainPhoto,
        qrCode: memorial.qrCode,
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
    const userCurrent = req.user
    //console.log("ESTOU EM Edit GALERIA - ID recebido:", id)

    try {
      const memorial = await Memorial.findOne({ _id: id })
        .populate({ path: "owner", select: "firstName lastName" })
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

      // Verificação de permissão
      const isOwner = memorial.owner && memorial.owner._id.toString() === userCurrent._id.toString()
      const isAdmin = userCurrent.role === "admin"
      const isCollaborator = memorial.collaborators && memorial.collaborators.some(
        collabId => collabId.toString() === userCurrent._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        req.flash("error_msg", "Você não tem permissão para editar a galeria.")
        return res.redirect(`/memorial/${memorial.slug}/gallery`)
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
        qrCode: memorial.qrCode,
        birth: memorial.birth,
        death: memorial.death,
        gallery: galleryData,
        theme: memorial.theme,
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
  uploadGallery: (req, res) => {
    // Verificar se o arquivo foi enviado
    //console.log("ESTOU EM UPDATE GALERIA - Slug recebido:", req.params.slug)
    const { slug } = req.params
    const userCurrent = req.user
    if (!req.file) {
      return res.status(400).send("Nenhum arquivo enviado.")
    }

    // Se o arquivo foi enviado, retornamos a mensagem de sucesso
    //res.send("Arquivo enviado com sucesso: " + req.file.filename)
    res.redirect(`/memorial/${slug}/gallery`)
  },

  // Upload de arquivos na galeria

  updateGallery: async (req, res) => {
    const { slug, tipo } = req.params
    const { caption } = req.body
    const file = req.file
    const userCurrent = req.user

    if (!file) return res.status(400).send("Nenhum arquivo enviado")

    try {
      const memorial = await Memorial.findOne({ slug })
      if (!memorial) return res.status(404).send("Memorial não encontrado")

      // Verificação de permissão
      const isOwner = memorial.owner && memorial.owner.toString() === userCurrent._id.toString()
      const isAdmin = userCurrent.role === "admin"
      const isCollaborator = memorial.collaborators && memorial.collaborators.some(
        collabId => collabId.toString() === userCurrent._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        req.flash("error_msg", "Você não tem permissão para fazer upload.")
        return res.redirect(`/memorial/${slug}/gallery`)
      }

      let gallery = await Gallery.findOne({ memorial: memorial._id })
      if (!gallery) {
        gallery = new Gallery({
          memorial: memorial._id,
          user: userCurrent._id,
          photos: [],
          audios: [],
          videos: [],
        })
      }

      const folder = getFolder(file.mimetype)
      const ext = path.extname(file.originalname)
      const filename = `${Date.now()}-${Math.random().toString(36).substring(3, 10)}${ext}`
      const key = `memorials/${slug}/${folder}/${filename}`

      await r2.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      )

      const fileData = {
        key,
        url: `${process.env.R2_PUBLIC_URL}/${key}`,
        originalName: file.originalname,
        caption: caption || "",
        uploadedBy: userCurrent._id,
      }

      if (tipo === "photo") gallery.photos.push(fileData)
      else if (tipo === "audio") gallery.audios.push(fileData)
      else if (tipo === "video") gallery.videos.push(fileData)
      else return res.status(400).send("Tipo inválido.")

      await gallery.save()

      res.redirect(`/memorial/${slug}/gallery/edit/${memorial._id}`)
    } catch (error) {
      console.error("Erro ao enviar para R2:", error)
      res.status(500).send("Erro no upload")
    }
  },

  // Atualizar legenda de um arquivo existente
  updateCaption: async (req, res) => {
    const { slug, tipo } = req.params
    const { key, caption } = req.body

    try {
      const memorial = await Memorial.findOne({ slug })
      if (!memorial) return res.status(404).send("Memorial não encontrado")

      // Verificação de permissão
      const currentUser = req.user
      const isOwner = memorial.owner && memorial.owner.toString() === currentUser._id.toString()
      const isAdmin = currentUser.role === "admin"
      const isCollaborator = memorial.collaborators && memorial.collaborators.some(
        collabId => collabId.toString() === currentUser._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        return res.status(403).send("Sem permissão")
      }

      const gallery = await Gallery.findOne({ memorial: memorial._id })
      if (!gallery) return res.status(404).send("Galeria não encontrada")

      const collectionName = `${tipo}s`
      if (!gallery[collectionName]) return res.status(400).send("Tipo inválido")

      const item = gallery[collectionName].find((i) => i.key === key)
      if (!item) return res.status(404).send("Arquivo não encontrado")

      item.caption = caption
      await gallery.save()

      res.redirect(`/memorial/${slug}/gallery/edit/${memorial._id}`)
    } catch (error) {
      console.error("Erro ao atualizar legenda:", error)
      res.status(500).send("Erro ao atualizar legenda")
    }
  },

  // Salvar todas as legendas em massa
  saveAllCaptions: async (req, res) => {
    const { slug } = req.params
    const { captions } = req.body // Espera um objeto { key: caption }

    try {
      const memorial = await Memorial.findOne({ slug })
      if (!memorial) return res.status(404).json({ error: "Memorial não encontrado" })

      // Verificação de permissão
      const currentUser = req.user
      const isOwner = memorial.owner && memorial.owner.toString() === currentUser._id.toString()
      const isAdmin = currentUser.role === "admin"
      const isCollaborator = memorial.collaborators && memorial.collaborators.some(
        collabId => collabId.toString() === currentUser._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        return res.status(403).json({ error: "Sem permissão" })
      }

      const gallery = await Gallery.findOne({ memorial: memorial._id })
      if (!gallery) return res.status(404).json({ error: "Galeria não encontrada" })

      if (captions && typeof captions === "object") {
        // Tipos de mídia na galeria
        const mediaTypes = ["photos", "audios", "videos"]

        mediaTypes.forEach(type => {
          if (gallery[type]) {
            gallery[type].forEach(item => {
              if (captions[item.key] !== undefined) {
                item.caption = captions[item.key]
              }
            })
          }
        })

        await gallery.save()
      }

      req.flash("success_msg", "Todas as legendas foram salvas com sucesso!")
      res.redirect(`/memorial/${slug}/gallery`)
    } catch (error) {
      console.error("Erro ao salvar todas as legendas:", error)
      req.flash("error_msg", "Erro ao salvar as legendas.")
      res.redirect(`/memorial/${slug}/gallery/edit/${slug}`)
    }
  },

  // Deletar um arquivo da galeria
  // Deletar um arquivo da galeria
  // Deletar um arquivo da galeria
  deleteFile: async (req, res) => {
    const { slug, tipo } = req.params
    const { key } = req.body // agora o frontend envia a KEY

    try {
      // ✅ Verificação do tipo antes de qualquer ação
      const tiposValidos = ["photo", "audio", "video"]
      if (!tiposValidos.includes(tipo)) {
        return res.status(400).send("Tipo inválido")
      }

      const memorial = await Memorial.findOne({ slug })
      if (!memorial) return res.status(404).send("Memorial não encontrado")

      // Verificação de permissão
      const currentUser = req.user
      const isOwner = memorial.owner && memorial.owner.toString() === currentUser._id.toString()
      const isAdmin = currentUser.role === "admin"
      const isCollaborator = memorial.collaborators && memorial.collaborators.some(
        collabId => collabId.toString() === currentUser._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        return res.status(403).send("Sem permissão")
      }

      const gallery = await Gallery.findOne({ memorial: memorial._id })
      if (!gallery) return res.status(404).send("Galeria não encontrada")

      await r2.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: key,
        })
      )

      gallery[`${tipo}s`] = gallery[`${tipo}s`].filter(
        (item) => item.key !== key
      )

      await gallery.save()

      res.redirect(`/memorial/${slug}/gallery/edit/${memorial._id}`)
    } catch (err) {
      console.error("Erro ao deletar arquivo:", err)
      res.status(500).send("Erro ao deletar arquivo")
    }
  },
}

module.exports = GalleryController
