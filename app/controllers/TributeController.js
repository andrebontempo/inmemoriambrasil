const Tribute = require("../models/Tribute") // Ajuste o caminho conforme necessário
const Memorial = require("../models/Memorial")
const Gallery = require("../models/Gallery")
const mongoose = require("mongoose")
const moment = require("moment-timezone")

const TributeController = {
  // Exibir o formulário de cadastro
  createTribute: async (req, res) => {
    // Garantir que o usuário autenticado esteja presente
    const userCurrent = req.session.loggedUser
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
      res.redirect(`/memorial/${slug}`)
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao criar tributo")
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
        .populate({ path: "user", select: "firstName lastName" })
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
      res.redirect(`/memorial/${slug}/about`) // Redireciona para a página do memorial
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
      res.redirect(`/memorial/${memorialSlug}`)
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao deletar tributo")
    }
  },
}

module.exports = TributeController
