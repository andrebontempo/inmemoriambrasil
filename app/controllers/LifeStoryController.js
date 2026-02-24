const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const Memorial = require("../models/Memorial") // ✅ Importando o modelo correto
const Gallery = require("../models/Gallery")
const path = require("path")
const fs = require("fs")
const moment = require("moment-timezone")
const { r2Client: r2, PutObjectCommand, DeleteObjectCommand } = require("../services/R2Service")

const LifeStoryController = {
  createLifeStory: async (req, res) => {
    const userCurrent = req.user

    try {
      let mediaKey = ""
      let fileUrl = ""

      if (req.file) {
        // validação defensiva
        if (!req.file.key || !req.file.url) {
          console.error(
            "uploadToR2 não informou key/url. Verifique a ordem dos middlewares."
          )
          return res.status(500).send("Erro no upload do arquivo")
        }

        mediaKey = req.file.key
        fileUrl = req.file.url
      }

      // buscar memorial (seu código)
      let memorial = await Memorial.findById(req.body.memorial)
      if (!memorial)
        memorial = await Memorial.findOne({ slug: req.params.slug })
      if (!memorial) {
        console.error("Erro: Memorial não encontrado!")
        return res.status(404).send("Memorial não encontrado")
      }

      // Verificação de permissão
      const isOwner = memorial.owner && memorial.owner.toString() === userCurrent._id.toString()
      const isAdmin = userCurrent.role === "admin"
      const isCollaborator = memorial.collaborators && memorial.collaborators.some(
        collabId => collabId.toString() === userCurrent._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        req.flash("error_msg", "Você não tem permissão para adicionar histórias.")
        return res.redirect(`/memorial/${memorial.slug}/lifestory`)
      }

      // Criar uma nova história de vida
      const newLifeStory = new LifeStory({
        memorial: memorial._id,
        slug: req.params.slug,
        user: userCurrent ? userCurrent._id : null,
        title: req.body.title,
        content: req.body.content,
        eventDate: req.body.eventDate,
        image: req.file
          ? {
            key: mediaKey,
            url: fileUrl,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
          }
          : null,
      })

      // Salvar no banco de dados
      await newLifeStory.save()
      req.flash("success_msg", "História de Vida criada com sucesso!")
      res.redirect(`/memorial/${memorial.slug}/lifestory`)
    } catch (error) {
      console.error("Erro ao criar história de vida:", error)
      res.status(500).render("errors/500")
    }
  },
  // Exibir histórias de vida de um memorial
  showLifeStory: async (req, res) => {
    const { slug } = req.params

    try {
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "owner", select: "firstName lastName" })
        .lean()

      if (!memorial) {
        return res.status(404).render("errors/404", {
          message: "Memorial não encontrado.",
        })
      }

      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .select("photos audios videos")
        .populate({ path: "user", select: "firstName lastName" })
        .lean()

      const galleryData = galeria || {
        photos: [],
        audios: [],
        videos: [],
      }

      const lifestories = await LifeStory.find({ memorial: memorial._id })
        .sort({ eventDate: 1 })
        .populate({ path: "user", select: "firstName lastName" })
        .select("title content eventDate image createdAt")
        .lean()

      const totalTributos = await Tribute.countDocuments({
        memorial: memorial._id,
      })
      const totalHistorias = await LifeStory.countDocuments({
        memorial: memorial._id,
      })
      const totalHistoriasCom = await SharedStory.countDocuments({
        memorial: memorial._id,
      })

      // Lógica de Permissionamento
      let canManageStory = false
      const currentUser = req.user

      if (currentUser) {
        const isOwner = memorial.owner && memorial.owner._id.toString() === currentUser._id.toString()
        const isAdmin = currentUser.role === "admin"
        const isCollaborator = memorial.collaborators && memorial.collaborators.some(
          collabId => collabId.toString() === currentUser._id.toString()
        )

        if (isOwner || isAdmin || isCollaborator) {
          canManageStory = true
        }
      }

      return res.render("memorial/memorial-lifestory", {
        layout: "memorial-layout",
        id: memorial._id,
        canManageStory,
        owner: {
          firstName: memorial.owner?.firstName || "",
          lastName: memorial.owner?.lastName || "",
        },
        activeLifeStory: true,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        gender: memorial.gender,
        kinship: memorial.kinship,
        mainPhoto: memorial.mainPhoto,
        qrCode: memorial.qrCode,
        lifeStory: lifestories || [],
        gallery: galleryData,
        birth: {
          date: memorial.birth?.date || "Não informada",
          city: memorial.birth?.city || "Local desconhecido",
          state: memorial.birth?.state || "Estado não informado",
          country: memorial.birth?.country || "País não informado",
        },
        death: {
          date: memorial.death?.date || "Não informada",
          city: memorial.death?.city || "Local desconhecido",
          state: memorial.death?.state || "Estado não informado",
          country: memorial.death?.country || "País não informado",
        },
        about: memorial.about,
        epitaph: memorial.epitaph,
        theme: memorial.theme,
        estatisticas: {
          totalVisitas: memorial.visits || 0,
          totalTributos,
          totalHistorias,
          totalHistoriasCom,
        },
      })
    } catch (error) {
      console.error("Erro ao exibir memorial:", error)
      return res.status(500).render("errors/500", {
        message: "Erro ao exibir memorial.",
      })
    }
  },

  editLifeStory: async (req, res) => {
    const { slug } = req.params
    try {
      const lifeStory = await LifeStory.findById(req.params.id).populate(
        "memorial"
      )

      if (!lifeStory) {
        return res.status(404).send("História não encontrada")
      }

      // Busca dados do memorial e galeria (mesmo que antes)
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "owner", select: "firstName lastName" })
        .populate({ path: "lifeStory", select: "title content eventDate" })
        .lean()

      if (!memorial) {
        return res
          .status(404)
          .render("errors/404", { message: "Memorial não encontrado." })
      }

      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .select("photos audios videos")
        .lean()

      res.render("memorial/edit/lifestory", {
        layout: "memorial-layout",
        lifeStory: lifeStory.toObject(),
        slug: lifeStory.memorial.slug,
        firstName: lifeStory.memorial.firstName,
        lastName: lifeStory.memorial.lastName,
        mainPhoto: lifeStory.memorial.mainPhoto,
        theme: memorial.theme,
        eventDate: moment(lifeStory.eventDate).format("YYYY-MM-DD"),
        birth: lifeStory.memorial.birth,
        death: lifeStory.memorial.death,
        gallery: galeria || { photos: [], audios: [], videos: [] },
      })
    } catch (error) {
      console.error("Erro ao editar história:", error)
      res.status(500).send("Erro interno do servidor")
    }
  },

  updateLifeStory: async (req, res) => {
    try {
      const { title, content, eventDate, slug } = req.body
      const lifeStory = await LifeStory.findById(req.params.id)

      if (!lifeStory) {
        return res.status(404).send("História não encontrada")
      }

      // Verificação de permissão
      const currentUser = req.user
      // Precisamos do memorial para checar owner/collaborators
      const memorial = await Memorial.findById(lifeStory.memorial)

      const isOwner = memorial.owner && memorial.owner.toString() === currentUser._id.toString()
      const isAdmin = currentUser.role === "admin"
      const isCollaborator = memorial.collaborators && memorial.collaborators.some(
        collabId => collabId.toString() === currentUser._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        req.flash("error_msg", "Você não tem permissão para atualizar histórias.")
        return res.redirect(`/memorial/${slug}/lifestory`)
      }

      // Se recebeu nova imagem via middleware
      if (req.file) {
        // Deleta imagem antiga da R2, se existir key completa
        if (lifeStory.image && lifeStory.image.key) {
          try {
            await r2.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: lifeStory.image.key,
              })
            )
          } catch (delErr) {
            console.error(
              "Erro ao deletar arquivo antigo no R2:",
              delErr.message
            )
            // não aborta a operação — apenas loga
          }
        }

        // **Não fazer upload aqui** — middleware já fez. Apenas salve os metadados retornados.
        if (!req.file.key || !req.file.url) {
          console.warn(
            "uploadToR2 não definiu req.file.key/req.file.url. Verifique a ordem dos middlewares."
          )
          return res.status(500).send("Erro no upload do arquivo.")
        }

        lifeStory.image = {
          key: req.file.key, // ex: memorials/<slug>/photos/<filename>
          url: req.file.url, // ex: https://.../memorials/<slug>/photos/<filename>
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
        }
      }

      // Atualiza demais campos
      if (title !== undefined) lifeStory.title = title
      if (content !== undefined) lifeStory.content = content
      if (eventDate && eventDate.trim() !== "") {
        lifeStory.eventDate = moment(eventDate, "YYYY-MM-DD").toDate()
      }

      await lifeStory.save()

      req.flash("success_msg", "História de Vida atualizada com sucesso!")
      res.redirect(`/memorial/${slug}/lifestory`)
    } catch (error) {
      console.error("Erro ao editar História de Vida:", error)
      req.flash("error_msg", "Erro ao salvar história de vida.")
      return res.redirect("back")
    }
  },

  deleteLifeStory: async (req, res) => {
    try {
      const lifeStory = await LifeStory.findById(req.params.id).populate(
        "memorial"
      )

      if (!lifeStory) {
        return res.status(404).send("História de Vida não encontrada")
      }

      // Verifica se o usuário tem permissão (dono, admin ou colaborador)
      const currentUser = req.user
      const isOwner = lifeStory.memorial.owner && lifeStory.memorial.owner.toString() === currentUser._id.toString()
      const isAdmin = currentUser.role === "admin"
      // Note: Colaboradores estão no memorial, não na story. lifeStory.memorial.collaborators deve estar populado ou disponível.
      // deleteLifeStory faz populate('memorial'), mas precisamos ver se collaborators está no schema do memorial.
      const isCollaborator = lifeStory.memorial.collaborators && lifeStory.memorial.collaborators.some(
        collabId => collabId.toString() === currentUser._id.toString()
      )

      if (!isOwner && !isAdmin && !isCollaborator) {
        req.flash(
          "error_msg",
          "Você não tem permissão para excluir esta história."
        )
        return res.redirect(`/memorial/${lifeStory.memorial.slug}/lifestory`)
      }

      // Se tiver arquivo, deleta no R2
      if (lifeStory.image && lifeStory.image.key) {
        try {
          await r2.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET,
              Key: lifeStory.image.key,
            })
          )
        } catch (r2Error) {
          console.error("Erro ao deletar arquivo no R2:", r2Error.message)
        }
      }

      // Deleta o documento no MongoDB
      await LifeStory.findByIdAndDelete(req.params.id)

      req.flash("success_msg", "História de Vida excluída com sucesso!")
      res.redirect(`/memorial/${lifeStory.memorial.slug}/lifestory`)
    } catch (error) {
      console.error("Erro ao deletar história:", error)
      res.status(500).send("Erro interno do servidor")
    }
  },
}

module.exports = LifeStoryController
