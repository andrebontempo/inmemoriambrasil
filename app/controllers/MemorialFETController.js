const Memorial = require("../models/Memorial")
const Gallery = require("../models/Gallery")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const { r2, DeleteObjectCommand } = require("../../config/r2") // ajuste caminho conforme necessário

const MemorialFETController = {
  editMemorialFET: async (req, res) => {
    try {
      const memorial = await Memorial.findOne({ slug: req.params.slug })
        .populate({ path: "owner", select: "firstName lastName" })
        .lean()

      if (!memorial) {
        return res.status(404).send("Memorial não encontrado")
      }

      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .populate({ path: "user", select: "firstName lastName" })
        .select("photos audios videos")
        .lean()

      const galleryData = galeria || {
        photos: [],
        audios: [],
        videos: [],
      }

      const totalTributos = await Tribute.countDocuments({
        memorial: memorial._id,
      })
      const totalHistorias = await LifeStory.countDocuments({
        memorial: memorial._id,
      })
      const totalHistoriasCom = await SharedStory.countDocuments({
        memorial: memorial._id,
      })

      return res.render("memorial/edit/memorial-fet", {
        layout: "memorial-layout",
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        mainPhoto: memorial.mainPhoto,
        epitaph: memorial.epitaph,
        biography: memorial.biography,
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
        gallery: galleryData,
        theme: memorial.theme || "Flores",
        estatisticas: {
          totalVisitas: memorial.visits || 0,
          totalTributos,
          totalHistorias,
          totalHistoriasCom,
        },
      })
    } catch (error) {
      console.error("Erro ao carregar memorial:", error)
      res.status(500).send("Erro interno do servidor")
    }
  },

  updateMemorialFET: async (req, res) => {
    try {
      const { slug } = req.params
      const { epitaph, theme } = req.body

      const memorial = await Memorial.findOne({ slug })

      if (!memorial) {
        return res.status(404).send("Memorial não encontrado")
      }

      const updateData = {
        epitaph,
        theme,
      }

      //console.log("req.file ao atualizar foto:", req.file)

      // Se vier uma nova foto no req.file (uploadToR2 middleware)
      if (req.file && req.file.key) {
        // Apaga a foto antiga da Cloudflare R2 (se existir)
        if (memorial.mainPhoto && memorial.mainPhoto.key) {
          try {
            await r2.send(
              new DeleteObjectCommand({
                Bucket: process.env.R2_BUCKET,
                Key: memorial.mainPhoto.key,
              })
            )
            //console.log("Foto antiga removida da R2:", memorial.mainPhoto.key)
          } catch (err) {
            console.error("Erro ao deletar foto antiga da R2:", err)
          }
        }

        // Atualiza mainPhoto com a nova info da R2
        updateData.mainPhoto = {
          key: req.file.key,
          url: req.file.url,
          originalName: req.file.originalname,
          updatedAt: new Date(),
        }
      }

      await Memorial.findOneAndUpdate({ slug }, updateData, { new: true })

      res.redirect(`/memorial/${slug}`)
    } catch (err) {
      console.error("Erro ao atualizar memorial:", err)
      res.status(500).send("Erro ao atualizar memorial")
    }
  },
}

module.exports = MemorialFETController
