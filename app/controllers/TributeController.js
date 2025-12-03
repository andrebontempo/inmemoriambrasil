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
    const userCurrent = req.session.user
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
      const tributes = await Tribute.find({ memorial: memorial._id })
        .sort({ createdAt: -1 })
        .populate({ path: "user", select: "firstName lastName" })
        .select("name message type image createdAt")
        .lean()

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
    const { slug } = req.params
    try {
      const tribute = await Tribute.findById(req.params.id).populate("memorial") // <--- aqui o populate

      if (!tribute) {
        return res.status(404).send("Tributo não encontrado")
      }
      /*
      console.log({
        slug: tribute.memorial.slug,
        mainPhoto: tribute.memorial.mainPhoto,
        birthDate: tribute.memorial.birth?.date,
        deathDate: tribute.memorial.death?.date,
      })
      */
      //Buscar dados do memorial para o painel direito
      const memorial = await Memorial.findOne({ slug })
        .populate({ path: "owner", select: "firstName lastName" })
        .populate({ path: "lifeStory", select: "title content eventDate" }) // Populate para lifeStory
        .populate({ path: "sharedStory", select: "title content eventDate" }) // Populate para sharedStory
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

      res.render("memorial/edit/tribute", {
        layout: "memorial-layout",
        tribute: tribute.toObject(), // Converte para objeto simples
        slug: tribute.memorial.slug, // Passa o slug do memorial
        firstName: tribute.memorial.firstName,
        lastName: tribute.memorial.lastName,
        mainPhoto: tribute.memorial.mainPhoto, // Passa a foto principal do memorial
        birth: tribute.memorial.birth,
        death: tribute.memorial.death,
        //gallery: tribute.memorial.gallery,
        gallery: galleryData,
        //birthDate: tribute.memorial.birth?.date,
        //deathDate: tribute.memorial.death?.date,
        //birthDate: tribute.memorial.birthDate, // Passa a data de nascimento do memorial
        //deathDate: tribute.memorial.deathDate, // Passa a data de falecimento do memorial
      })
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao carregar tributo para edição.")
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
