const SharedStory = require("../models/SharedStory")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const Memorial = require("../models/Memorial")
const Gallery = require("../models/Gallery")
const path = require("path")
const fs = require("fs")
const moment = require("moment-timezone")
const { r2, PutObjectCommand } = require("../../config/r2")
const { DeleteObjectCommand } = require("@aws-sdk/client-s3")

const SharedStoryController = {
  createSharedStory: async (req, res) => {
    const userCurrent = req.session.user

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

      // Criar uma nova história compartilhada
      const newSharedStory = new SharedStory({
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
      await newSharedStory.save()
      req.flash("success_msg", "História Compartilhada criada com sucesso!")
      res.redirect(`/memorial/${memorial.slug}/sharedstory`)
    } catch (error) {
      console.error("Erro ao criar história compartilhada:", error)
      res.status(500).render("errors/500")
    }
  },

  // Exibir histórias compartilhadas de um memorial
  showSharedStory: async (req, res) => {
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

      const sharedstories = await SharedStory.find({ memorial: memorial._id })
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

      return res.render("memorial/memorial-sharedstory", {
        layout: "memorial-layout",
        id: memorial._id,
        owner: {
          firstName: memorial.owner?.firstName || "",
          lastName: memorial.owner?.lastName || "",
        },
        activeSharedStory: true,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        gender: memorial.gender,
        kinship: memorial.kinship,
        mainPhoto: memorial.mainPhoto,
        qrCode: memorial.qrCode,
        //lifeStory: lifestories || [],
        sharedStory: sharedstories || [],
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

  editSharedStory: async (req, res) => {
    const { slug } = req.params
    try {
      const sharedStory = await SharedStory.findById(req.params.id).populate(
        "memorial"
      )

      if (!sharedStory) {
        return res.status(404).send("História não encontrada")
      }

      // Busca dados do memorial e galeria (mesmo que antes)
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "owner", select: "firstName lastName" })
        .populate({ path: "sharedStory", select: "title content eventDate" })
        .lean()

      if (!memorial) {
        return res
          .status(404)
          .render("errors/404", { message: "Memorial não encontrado." })
      }

      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .select("photos audios videos")
        .lean()

      res.render("memorial/edit/sharedstory", {
        layout: "memorial-layout",
        sharedStory: sharedStory.toObject(),
        slug: sharedStory.memorial.slug,
        firstName: sharedStory.memorial.firstName,
        lastName: sharedStory.memorial.lastName,
        mainPhoto: sharedStory.memorial.mainPhoto,
        eventDate: moment(sharedStory.eventDate).format("YYYY-MM-DD"),
        birth: sharedStory.memorial.birth,
        death: sharedStory.memorial.death,
        gallery: galeria || { photos: [], audios: [], videos: [] },
      })
    } catch (error) {
      console.error("Erro ao editar história:", error)
      res.status(500).send("Erro interno do servidor")
    }
  },
  updateSharedStory: async (req, res) => {
    try {
      const { title, content, eventDate, slug } = req.body
      const sharedStory = await SharedStory.findById(req.params.id)

      if (!sharedStory) {
        return res.status(404).send("História não encontrada")
      }

      // Se recebeu nova imagem via middleware
      if (req.file) {
        // Deleta imagem antiga da R2, se existir key completa
        if (sharedStory.image && sharedStory.image.key) {
          try {
            await r2.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: sharedStory.image.key,
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

        sharedStory.image = {
          key: req.file.key, // ex: memorials/<slug>/photos/<filename>
          url: req.file.url, // ex: https://.../memorials/<slug>/photos/<filename>
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
        }
      }

      // Atualiza demais campos
      if (title !== undefined) sharedStory.title = title
      if (content !== undefined) sharedStory.content = content
      if (eventDate && eventDate.trim() !== "") {
        sharedStory.eventDate = moment(eventDate, "YYYY-MM-DD").toDate()
      }

      await sharedStory.save()

      req.flash("success_msg", "História de Vida atualizada com sucesso!")
      res.redirect(`/memorial/${slug}/sharedstory`)
    } catch (error) {
      console.error("Erro ao editar História de Vida:", error)
      req.flash("error_msg", "Erro ao salvar história de vida.")
      return res.redirect("back")
    }
  },
  deleteSharedStory: async (req, res) => {
    try {
      const sharedStory = await SharedStory.findById(req.params.id).populate(
        "memorial"
      )

      if (!sharedStory) {
        return res.status(404).send("História de Vida não encontrada")
      }

      // Verifica se o usuário tem permissão (criador do memorial)
      if (
        !req.session.user ||
        sharedStory.memorial.owner.toString() !==
          req.session.user._id.toString()
      ) {
        req.flash(
          "error_msg",
          "Você não tem permissão para excluir esta história."
        )
        return res.redirect(
          `/memorial/${sharedStory.memorial.slug}/sharedstory`
        )
      }

      // Se tiver arquivo, deleta no R2
      if (sharedStory.image && sharedStory.image.key) {
        try {
          await r2.send(
            new DeleteObjectCommand({
              Bucket: process.env.R2_BUCKET,
              Key: sharedStory.image.key,
            })
          )
        } catch (r2Error) {
          console.error("Erro ao deletar arquivo no R2:", r2Error.message)
        }
      }

      // Deleta o documento no MongoDB
      await SharedStory.findByIdAndDelete(req.params.id)

      req.flash("success_msg", "História de Vida excluída com sucesso!")
      res.redirect(`/memorial/${sharedStory.memorial.slug}/sharedstory`)
    } catch (error) {
      console.error("Erro ao deletar história:", error)
      res.status(500).send("Erro interno do servidor")
    }
  },
}
// Exporta o controlador
module.exports = SharedStoryController
