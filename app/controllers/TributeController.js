const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const Memorial = require("../models/Memorial") // ✅ Importando o modelo correto
const Gallery = require("../models/Gallery")
const mongoose = require("mongoose")
const moment = require("moment-timezone")
const { calcularIdade, formatDate } = require("../utils/helpers")

const TributeController = {
  // Exibir o formulário de cadastro
  createTribute: async (req, res) => {
    // Garantir que o usuário autenticado esteja presente
    const userCurrent = req.user
    try {
      //console.log(req.body)
      // Verifique se 'memorial' está no corpo da requisição
      if (!req.body.memorial) {
        return res.status(400).send("Memorial ID não fornecido.")
      }

      const memorialId = req.body.memorial // Pegue o ID do memorial
      const { type, message, slug } = req.body // Tipo e mensagem do tributo

      // Criação do novo tributo
      const newTribute = new Tribute({
        memorial: memorialId,
        type: type,
        message: message,
        name: "Nome do Tributo",
        createdAt: moment().toDate(), // Armazena em UTC (padrão)
        user: new mongoose.Types.ObjectId(userCurrent._id),
        //name: req.user.firstName + " " + req.user.lastName, // Nome do usuário logado
      })

      // Salve o tributo no banco de dados
      await newTribute.save()

      // Redirecione de volta para o memorial
      res.redirect(`/memorial/${slug}/tribute`)
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao criar tributo")
    }
  },

  // Método para mostrar um tributo (GET)
  showTribute: async (req, res) => {
    const { slug } = req.params
    try {
      // Atualiza visitas e popula os dados do memorial
      const memorial = await Memorial.findOneAndUpdate(
        { slug },
        { $inc: { visits: 1 } },
        { new: true }
      )
        .populate({ path: "owner", select: "firstName lastName" })
        .populate({ path: "lifeStory", select: "title content" })
        .populate({ path: "sharedStory", select: "title content" })
        .populate({ path: "gallery.photos", select: "url" })
        .populate({ path: "gallery.audios", select: "url" })
        .populate({ path: "gallery.videos", select: "url" })
        .lean()

      if (!memorial) {
        return res.status(404).render("errors/404", {
          message: "Memorial não encontrado.",
        })
      }

      // Buscar tributos relacionados
      const tributesRaw = await Tribute.find({ memorial: memorial._id })
        .sort({ createdAt: -1 })
        .populate({ path: "user", select: "firstName lastName _id" })
        .select("name message type image createdAt user")
        .lean()

      const currentUser = req.user

      const tributes = tributesRaw.map(tribute => {
        let canEdit = false

        if (currentUser) {
          const isAuthor = tribute.user && tribute.user._id.toString() === currentUser._id.toString()
          const isOwner = memorial.owner && memorial.owner._id.toString() === currentUser._id.toString()
          const isAdmin = currentUser.role === "admin"

          const isCollaborator = memorial.collaborators && memorial.collaborators.some(
            collabId => collabId.toString() === currentUser._id.toString()
          )

          if (isAuthor || isOwner || isAdmin || isCollaborator) {
            canEdit = true
          }
        }

        return {
          ...tribute,
          canEdit
        }
      })



      // Buscar galeria relacionada
      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .populate({ path: "user", select: "firstName lastName" })
        .select("photos audios videos")
        .lean()

      const galleryData = galeria || {
        photos: [],
        audios: [],
        videos: [],
      }

      // Buscar contagem de histórias (caso tenha múltiplas associadas a esse memorial)
      const totalHistorias = await LifeStory.countDocuments({
        memorial: memorial._id,
      })
      // Buscar contagem de histórias (caso tenha múltiplas associadas a esse memorial)
      const totalHistoriasCom = await SharedStory.countDocuments({
        memorial: memorial._id,
      })

      return res.render("memorial/memorial-tribute", {
        layout: "memorial-layout",
        owner: memorial.owner,
        activeTribute: true,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        id: memorial._id,
        gender: memorial.gender,
        kinship: memorial.kinship,
        biography: memorial.biography,
        mainPhoto: memorial.mainPhoto,
        qrCode: memorial.qrCode,
        tribute: tributes || [],
        lifeStory: memorial.lifeStory || [],
        sharedStory: memorial.sharedStory || [],
        gallery: galleryData,
        idade: calcularIdade(memorial.birth?.date, memorial.death?.date),
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
          totalTributos: tributes.length || 0,
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

  // Método para editar um tributo (GET)
  editTribute: async (req, res) => {
    const { slug, id } = req.params

    try {
      const currentUser = req.user

      // Buscar tributo e popular memorial
      const tribute = await Tribute.findById(id)
        .populate({
          path: "memorial",
          populate: {
            path: "owner",
            select: "firstName lastName"
          }
        })
        .populate({
          path: "user",
          select: "firstName lastName _id"
        })

      if (!tribute) {
        return res.status(404).send("Tributo não encontrado")
      }

      const memorial = tribute.memorial

      if (!memorial || memorial.slug !== slug) {
        return res.status(404).render("errors/404", {
          message: "Memorial não encontrado.",
        })
      }

      // ===== REGRA DE PERMISSÃO =====
      let canEdit = false

      if (currentUser) {
        const isAuthor =
          tribute.user &&
          tribute.user._id.toString() === currentUser._id.toString()

        const isOwner =
          memorial.owner &&
          memorial.owner._id.toString() === currentUser._id.toString()

        const isAdmin = currentUser.role === "admin"

        const isCollaborator =
          memorial.collaborators &&
          memorial.collaborators.some(
            collabId => collabId.toString() === currentUser._id.toString()
          )

        if (isAuthor || isOwner || isAdmin || isCollaborator) {
          canEdit = true
        }
      }

      // Se não pode editar, bloqueia
      if (!canEdit) {
        return res.status(403).render("errors/403", {
          message: "Você não tem permissão para editar este tributo.",
        })
      }

      // ===== GALERIA =====
      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .populate({ path: "user", select: "firstName lastName" })
        .select("photos audios videos")
        .lean()

      const galleryData = galeria || {
        photos: [],
        audios: [],
        videos: [],
      }

      // ===== ESTATÍSTICAS =====
      const totalHistorias = await LifeStory.countDocuments({
        memorial: memorial._id,
      })

      const totalHistoriasCom = await SharedStory.countDocuments({
        memorial: memorial._id,
      })

      const totalTributos = await Tribute.countDocuments({
        memorial: memorial._id,
      })

      // ===== RENDER =====
      return res.render("memorial/edit/tribute", {
        layout: "memorial-layout",

        // 🔥 IMPORTANTE para sidebar funcionar
        owner: memorial.owner,
        activeTribute: true,

        tribute: tribute.toObject(),
        slug: memorial.slug,
        id: memorial._id,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        mainPhoto: memorial.mainPhoto,
        qrCode: memorial.qrCode,
        theme: memorial.theme,
        birth: memorial.birth,
        death: memorial.death,
        gallery: galleryData,

        estatisticas: {
          totalVisitas: memorial.visits || 0,
          totalTributos,
          totalHistorias,
          totalHistoriasCom,
        },
      })

    } catch (error) {
      console.error("Erro ao carregar tributo para edição:", error)
      return res.status(500).render("errors/500", {
        message: "Erro ao carregar tributo para edição.",
      })
    }
  },

  // Rota para atualizar um tributo (POST)
  updateTribute: async (req, res) => {
    try {
      const { type, message, name, slug } = req.body
      const tribute = await Tribute.findByIdAndUpdate(
        req.params.id,
        { type, message, name },
        { new: true } // Retorna o tributo atualizado
      )
      if (!tribute) {
        return res.status(404).send("Tributo não encontrado")
      }
      res.redirect(`/memorial/${slug}/tribute`) // Redireciona para a página do memorial
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao atualizar tributo.")
    }
  },

  // Deletar um tributo
  deleteTribute: async (req, res) => {
    try {
      const tributeId = req.params.id

      // Busca o tributo e carrega os detalhes do memorial
      const tribute = await Tribute.findById(tributeId).populate("memorial")

      if (!tribute) {
        return res.status(404).send("Tributo não encontrado")
      }

      // Agora podemos acessar o slug do memorial
      const memorialSlug = tribute.memorial.slug

      // Deleta o tributo do banco de dados
      await Tribute.findByIdAndDelete(tributeId)

      // Redireciona para a página do memorial
      res.redirect(`/memorial/${memorialSlug}/tribute`)
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao deletar tributo")
    }
  },
}

module.exports = TributeController
