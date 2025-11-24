const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const Memorial = require("../models/Memorial") // ✅ Importando o modelo correto
const Gallery = require("../models/Gallery")
const path = require("path")
const fs = require("fs")
const moment = require("moment-timezone")
//const { PutObjectCommand } = require("@aws-sdk/client-s3")
//const r2 = require("../../config/r2")
const { r2, PutObjectCommand } = require("../../config/r2")
const { DeleteObjectCommand } = require("@aws-sdk/client-s3")

const LifeStoryController = {
  createLifeStory: async (req, res) => {
    const userCurrent = req.session.loggedUser

    try {
      let mediaFileName = ""
      let fileUrl = ""

      if (req.file) {
        const timestamp = Date.now()
        const originalName = req.file.originalname.replace(/\s+/g, "_")
        mediaFileName = `${timestamp}_${originalName}`

        const command = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: mediaFileName,
          Body: req.file.buffer,
          ContentType: req.file.mimetype,
        })

        await r2.send(command)

        fileUrl = req.file.url

        //fileUrl = `https://${process.env.R2_BUCKET}.r2.cloudflarestorage.com/${mediaFileName}`
      }

      // Buscar memorial
      let memorial = await Memorial.findById(req.body.memorial)
      if (!memorial) {
        memorial = await Memorial.findOne({ slug: req.params.slug })
      }
      if (!memorial) {
        console.error("Erro: Memorial não encontrado!")
        return res.status(404).send("Memorial não encontrado")
      }

      // Criar nova história de vida com objeto image
      const newLifeStory = new LifeStory({
        memorial: memorial._id,
        slug: req.params.slug,
        user: userCurrent ? userCurrent._id : null,
        title: req.body.title,
        content: req.body.content,
        eventDate: req.body.eventDate,
        image: {
          key: mediaFileName,
          url: fileUrl,
          originalName: req.file ? req.file.originalname : "",
        },
      })

      await newLifeStory.save()

      req.flash("success_msg", "História de Vida criada com sucesso!")
      res.redirect(`/memorial/${memorial.slug}/lifestory`)
    } catch (error) {
      console.error("Erro ao criar história de vida:", error)
      res.status(500).render("errors/500")
    }
  },

  showLifeStory: async (req, res) => {
    const { slug } = req.params

    try {
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "user", select: "firstName lastName" })
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

      return res.render("memorial/memorial-lifestory", {
        layout: "memorial-layout",
        id: memorial._id,
        user: {
          firstName: memorial.user?.firstName || "",
          lastName: memorial.user?.lastName || "",
        },
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        gender: memorial.gender,
        kinship: memorial.kinship,
        mainPhoto: memorial.mainPhoto,
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
      //console.log("Lifestory encontrado:", lifeStory)
      if (!lifeStory) {
        return res.status(404).send("História não encontrada")
      }

      if (req.file) {
        if (lifeStory.image) {
          const oldPath = path.join(
            __dirname,
            "..",
            "..",
            "public",
            "memorials",
            `${slug}`,
            "photos",
            lifeStory.image
          )
          if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath)
        }
        lifeStory.image = `/uploads/${req.file.filename}`
      }

      //Busca os dados para o painel lateral direito
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "user", select: "firstName lastName" })
        .populate({ path: "lifeStory", select: "title content eventDate" }) // Populate para lifeStory
        //.populate({ path: "sharedStory", select: "title content" }) // Populate para sharedStory
        //.populate({ path: "gallery.photos", select: "url" }) // Populate para fotos da galeria
        //.populate({ path: "gallery.audios", select: "url" }) // Populate para áudios da galeria
        //.populate({ path: "gallery.videos", select: "url" }) // Populate para vídeos da galeria
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

      res.render("memorial/edit/lifestory", {
        layout: "memorial-layout",
        lifeStory: lifeStory.toObject(), // Converte para objeto simples
        slug: lifeStory.memorial.slug, // Passa o slug do memorial
        firstName: lifeStory.memorial.firstName,
        lastName: lifeStory.memorial.lastName,
        mainPhoto: lifeStory.memorial.mainPhoto, // Passa a foto principal do memorial
        eventDate: moment(lifeStory.eventDate).format("YYYY-MM-DD"),
        birth: lifeStory.memorial.birth,
        death: lifeStory.memorial.death,
        gallery: galleryData,
      })
    } catch (error) {
      console.error("Erro ao editar história:", error)
      res.status(500).send("Erro interno do servidor")
    }
  },
  updateLifeStory: async (req, res) => {
    try {
      //console.log("🔥 Dentro do updateLifeStory")
      //console.log("📁 req.file:", req.file) // se enviou nova imagem
      //console.log("📝 req.body:", req.body) // dados do formulário

      const { title, content, eventDate, slug } = req.body
      const lifeStory = await LifeStory.findById(req.params.id)

      if (!lifeStory) {
        return res.status(404).send("História não encontrada")
      }

      // Atualiza imagem se nova imagem for enviada
      if (req.file) {
        // Se já existe uma imagem associada, exclua a antiga
        if (lifeStory.image) {
          const oldPath = path.join(
            __dirname,
            "..",
            "..",
            "public",
            "memorials",
            `${slug}`,
            "photos",
            lifeStory.image
          )
          //console.log("🔥 Excluindo imagem antiga:", oldPath) // Verifique se o caminho está correto
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath)
          }
        }
        // Atualiza o campo de imagem para o novo caminho
        const newImagePath = `${req.file.filename}`
        lifeStory.image = newImagePath
        //console.log("📁 Nova imagem:", lifeStory.image) // Verifique se o novo caminho está correto
      }

      // Atualiza os campos
      lifeStory.title = title
      lifeStory.content = content

      // Só atualiza eventDate se ele estiver presente e válido
      if (eventDate && eventDate.trim() !== "") {
        lifeStory.eventDate = moment(eventDate, "YYYY-MM-DD").toDate()
      }

      await lifeStory.save()
      req.flash("success_msg", "História de Vida atualizada com sucesso!")
      res.redirect(`/memorial/${slug}/lifestory`)
    } catch (error) {
      console.error("Erro ao editar História de Vida:", error)
      req.flash("error_msg", "Título e conteúdo são obrigatórios.")
      return res.redirect("back")
      //res.status(500).send("Erro interno do servidor")
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

      if (lifeStory.image && lifeStory.image.key) {
        await r2.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: lifeStory.image.key,
          })
        )
      }

      await LifeStory.findByIdAndDelete(req.params.id)

      req.flash("success_msg", "História de Vida - Excluída com Sucesso!")

      res.redirect(`/memorial/${lifeStory.memorial.slug}/lifestory`)
    } catch (error) {
      console.error("Erro ao deletar história:", error)
      res.status(500).send("Erro interno do servidor")
    }
  },
}

module.exports = LifeStoryController
