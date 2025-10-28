const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const Memorial = require("../models/Memorial") // ✅ Importando o modelo correto
const Gallery = require("../models/Gallery")
const path = require("path")
const fs = require("fs")
const moment = require("moment-timezone")

const LifeStoryController = {
  createLifeStory: async (req, res) => {
    const userCurrent = req.session.loggedUser

    //console.log("Chegando em createLifeStory")
    //console.log("req.params.slug:", req.params.slug)
    //console.log("req.body:", req.body)

    try {
      // Buscar o memorial pelo ID (se estiver no body) ou pelo slug (se necessário)
      let memorial = await Memorial.findById(req.body.memorial)

      if (!memorial) {
        // Tentar buscar pelo slug caso o ID não tenha sido encontrado
        memorial = await Memorial.findOne({ slug: req.params.slug })
      }

      if (!memorial) {
        console.error("Erro: Memorial não encontrado!")
        return res.status(404).send("Memorial não encontrado")
      }

      // Criar a história de vida com os dados corretos
      const newLifeStory = new LifeStory({
        memorial: memorial._id, // Pegando o ID do memorial corretamente
        slug: req.params.slug,
        user: userCurrent ? userCurrent._id : null, // Definir usuário se estiver autenticado
        title: req.body.title,
        content: req.body.content,
        eventDate: req.body.eventDate,
        image: req.file ? `${req.file.filename}` : "",
      })

      // Salvar no banco de dados
      await newLifeStory.save()
      //console.log("História de vida salva com sucesso!")
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
    //console.log("ESTOU AQUI EXIBIR LIFESTORY - Slug recebido:", slug)
    try {
      const memorial = await Memorial.findOne({ slug })
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

      // Buscar os Lifestories relacionados ao memorial
      const lifestories = await LifeStory.find({ memorial: memorial._id })
        .sort({ eventDate: 1 }) // 1 = crescente
        .populate({ path: "user", select: "firstName lastName" }) // Aqui, populando o campo user com firstName e lastName
        .select("title content eventDate image createdAt") // Selecionando campos específicos dos tributos
        .lean() // Garantir que o resultado seja simples (não um documento Mongoose)

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

      return res.render("memorial/memorial-lifestory", {
        layout: "memorial-layout",
        id: memorial._id,
        user: {
          firstName: memorial.user.firstName || "Primeiro Nome Não informado",
          lastName: memorial.user.lastName || "Último Nome Não informado",
        },
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        id: memorial._id,
        gender: memorial.gender,
        kinship: memorial.kinship,
        mainPhoto: memorial.mainPhoto,
        lifeStory: lifestories || [], // Passando lifeStory para o template
        gallery: galleryData,
        //idade: calcularIdade(memorial.birth?.date, memorial.death?.date),
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
        // Envia estatísticas específicas para a view
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
    const { slug } = req.body
    try {
      const lifeStory = await LifeStory.findById(req.params.id).populate(
        "memorial"
      )

      if (!lifeStory) {
        return res.status(404).send("História de Vida não encontrada")
      }

      if (lifeStory.image) {
        const imagePath = path.join(
          __dirname,
          "..",
          "..",
          "public",
          "memorials",
          `${slug}`,
          "photos",
          lifeStory.image
        )
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath)
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
