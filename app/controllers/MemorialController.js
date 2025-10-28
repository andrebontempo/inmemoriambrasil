const Memorial = require("../models/Memorial")
const User = require("../models/User")
const Tribute = require("../models/Tribute") // Ajuste o caminho conforme necessário
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const Gallery = require("../models/Gallery")
const path = require("path")
const fs = require("fs")
const { Console } = require("console")
const mongoose = require("mongoose")
const moment = require("moment-timezone")
const { calcularIdade } = require("../utils/helpers")
const MailService = require("../services/MailService")
const session = require("express-session")

const MemorialController = {
  renderStep1: (req, res) => {
    res.render("memorial/create-step1") // Renderiza a view do passo 1 (Nome e Sobrenome)
  },
  createStep1: async (req, res) => {
    // console.log("Usuário logado:", req.session.loggedUser)
    // console.log("Corpo da requisição recebido:", req.body)

    const userCurrent = req.session.loggedUser
    const { firstName, lastName } = req.body

    /*
    if (!userCurrent) {
      return res.redirect("/auth/login")
    }
    */
    if (!req.session.memorial) req.session.memorial = {}

    req.session.memorial.firstName = firstName
    req.session.memorial.lastName = lastName

    res.redirect("/memorial/create-step2")
  },
  renderStep2: (req, res) => {
    const step1Data = req.session.memorial || {}

    //Lista de parentesco
    const kinships = [
      { value: "amiga", label: "Amiga" },
      { value: "amigo", label: "Amigo" },
      { value: "avo", label: "Avô" },
      { value: "avó", label: "Avó" },
      { value: "filha", label: "Filha" },
      { value: "filho", label: "Filho" },
      { value: "irma", label: "Irmã" },
      { value: "irmao", label: "Irmão" },
      { value: "mae", label: "Mãe" },
      { value: "marido", label: "Marido" },
      { value: "esposa", label: "Esposa" },
      { value: "pai", label: "Pai" },
      { value: "tia", label: "Tia" },
      { value: "tio", label: "Tio" },
      { value: "sogro", label: "Sogro" },
      { value: "sogra", label: "Sogra" },
    ]

    // Ordena por ordem alfabética do label
    kinships.sort((a, b) => a.label.localeCompare(b.label))

    res.render("memorial/create-step2", { step1Data, kinships }) // Renderiza a view do passo 2 (Dados de Nascimento e Falecimento)
  },
  createStep2: async (req, res) => {
    const { gender, kinship, birth, death } = req.body

    // Ajusta o objeto `birth` garantindo valores padrões
    const birth1 = {
      date: req.body["birth.date"] || null,
      city: req.body["birth.city"] || "Local desconhecido",
      state: req.body["birth.state"] || "Estado não informado",
      country: req.body["birth.country"] || "País não informado",
    }

    // Ajusta o objeto `death` garantindo valores padrões
    const death1 = {
      date: req.body["death.date"] || null,
      city: req.body["death.city"] || "Local desconhecido",
      state: req.body["death.state"] || "Estado não informado",
      country: req.body["death.country"] || "País não informado",
    }

    // Ajusta a galeria para garantir um array mesmo que esteja vazio
    const gallery = {
      photos: req.body["gallery.photos"] ? [req.body["gallery.photos"]] : [],
      audios: req.body["gallery.audios"] ? [req.body["gallery.audios"]] : [],
      videos: req.body["gallery.videos"] ? [req.body["gallery.videos"]] : [],
    }

    if (!req.session.memorial) {
      return res.redirect("/memorial/create-step1")
    }
    req.session.memorial.gender = gender
    req.session.memorial.kinship = kinship
    req.session.memorial.birth = birth1
    req.session.memorial.death = death1

    res.redirect("/memorial/create-step3")
  },
  renderStep3: (req, res) => {
    if (!req.session.memorial) {
      return res.redirect("/memorial/create-step1")
    }
    res.render("memorial/create-step3")
  },
  createStep3: async (req, res) => {
    try {
      const { plan } = req.body
      const memorial = req.session.memorial
      const user = req.session.loggedUser
      const userCurrent = req.session.loggedUser

      if (!memorial || !user) {
        return res.redirect("/memorial/create-step1")
      }

      // Ajusta a galeria para garantir um array mesmo que esteja vazio
      const gallery = {
        photos: req.body["gallery.photos"] ? [req.body["gallery.photos"]] : [],
        audios: req.body["gallery.audios"] ? [req.body["gallery.audios"]] : [],
        videos: req.body["gallery.videos"] ? [req.body["gallery.videos"]] : [],
      }

      // Verifica se nome e sobrenome foram informados
      if (!memorial.firstName || !memorial.lastName) {
        return res.status(400).render("errors/400", {
          message: "Nome e sobrenome são obrigatórios!",
        })
      }

      // Gera o slug baseado no nome e sobrenome
      const slug = `${memorial.firstName}-${memorial.lastName}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/ç/g, "c")
        .replace(/\s+/g, "-")

      memorial.plan = plan
      memorial.user = user._id
      memorial.slug = slug

      // ✅ Corrigir mainPhoto se for string
      if (typeof memorial.mainPhoto === "string") {
        memorial.mainPhoto = {
          url: memorial.mainPhoto,
          //originalName: "foto-sem-nome.jpg", // opcional
        }
      }

      //console.log("DADOS do memorial:", memorialData)

      // Verifica se o memorial já existe
      const memorialExistente = await Memorial.findOne({ slug })
      console.log("Memorial existente:", memorialExistente, slug)
      if (memorialExistente) {
        return res.status(400).render("errors/400", {
          message: "Já existe um memorial com esse nome.",
        })
      }
      // Cria o memorial
      const newMemorial = new Memorial({
        user: userCurrent._id,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        mainPhoto: memorial.mainPhoto,
        plan: memorial.plan,
        slug: memorial.slug,
        gender: memorial.gender, // || "Não informado",
        kinship: memorial.kinship, // || "Não informado",
        visibility: req.body.visibility || "public", // Usa o valor de visibilidade do formulário
        birth: memorial.birth,
        death: memorial.death,
      })
      // Salvar memorial no banco
      //const newMemorial = await Memorial.create(memorial)
      await newMemorial.save()

      // Envia e-mail para o usuário
      await MailService.sendEmail({
        to: userCurrent.email,
        subject: "Seu memorial foi criado com sucesso",
        html: `
          <h1>Olá, ${userCurrent.firstName}</h1>
          <p>O memorial de <strong>${memorial.firstName} ${memorial.lastName}</strong> foi criado com sucesso.</p>
          <p>Você pode acessá-lo aqui: <a href="localhost:3000/memorial/${slug}">Ver memorial</a></p>
        `,
      })
      // Atualizar sessão
      req.session.memorialId = newMemorial._id
      req.session.memorialSlug = newMemorial.slug
      req.session.memorial = null // limpa os dados temporários

      res.redirect("/memorial/create-step4")
    } catch (err) {
      console.error("Erro ao salvar memorial:", err)
      res.status(500).render("error", {
        message: "Erro ao criar memorial. Tente novamente.",
      })
    }
  },
  renderStep4: (req, res) => {
    if (!req.session.memorialId) {
      return res.redirect("/memorial/create-step1")
    }
    //res.render("memorial/create-step4")
    res.render("memorial/create-step4", {
      memorialId: req.session.memorialId,
      slug: req.session.memorialSlug, // <--- AQUI
    })
  },
  createStep4: async (req, res) => {
    //console.log("STEP4 - Recebendo requisição para ATUALIZAR:", req.params)
    //console.log("Corpo da requisição recebido:", req.body)
    //console.log("Arquivo recebido:", req.file)
    try {
      //const { slug } = req.params
      const { slug, epitaph, theme } = req.body // Campos de texto que sempre podem ser atualizados

      const memorial = await Memorial.findOne({ slug })

      if (!memorial) {
        return res.status(404).send("Memorial não encontrado")
      }

      // Vamos preparar os dados que queremos atualizar
      const updateData = {
        epitaph,
        theme,
      }

      // Se vier uma nova foto no req.file
      if (req.file) {
        //console.log("Nova foto recebida:", req.file.filename)

        // Caminho da foto atual
        const fotoAntiga = memorial.mainPhoto?.url
        if (fotoAntiga) {
          const caminhoFotoAntiga = path.join(
            __dirname,
            "..",
            "..",
            "public",
            "memorials",
            slug,
            "photos",
            fotoAntiga
          )

          // Verifica se o arquivo existe antes de tentar apagar
          if (fs.existsSync(caminhoFotoAntiga)) {
            fs.unlinkSync(caminhoFotoAntiga)
            //console.log("Foto antiga deletada:", fotoAntiga)
          }
        }

        // Atualizar a mainPhoto no memorial
        updateData.mainPhoto = {
          url: req.file.filename,
          updatedAt: new Date(),
          originalName: req.file.originalname,
        }
      }

      // Agora atualiza no banco de dados
      await Memorial.findOneAndUpdate({ slug }, updateData, { new: true })

      req.flash("success_msg", "Memorial Virtual - Criado com Sucesso!")

      // Redirecionar para o memorial
      res.redirect(`/memorial/${slug}`)
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao atualizar memorial")
    }
  },

  createMemorial: async (req, res) => {
    //console.log("Usuário logado:", req.session.loggedUser) // Exibe o usuário autenticado no console
    //console.log("Corpo da requisição recebido:", req.body) //  Verifica os dados enviados

    const userCurrent = req.session.loggedUser
    const { firstName, lastName, gender, kinship } = req.body

    // Ajusta o objeto `birth` garantindo valores padrões
    const birth = {
      date: req.body["birth.date"] || null,
      city: req.body["birth.city"] || "Local desconhecido",
      state: req.body["birth.state"] || "Estado não informado",
      country: req.body["birth.country"] || "País não informado",
    }

    // Ajusta o objeto `death` garantindo valores padrões
    const death = {
      date: req.body["death.date"] || null,
      city: req.body["death.city"] || "Local desconhecido",
      state: req.body["death.state"] || "Estado não informado",
      country: req.body["death.country"] || "País não informado",
    }

    // Ajusta a galeria para garantir um array mesmo que esteja vazio
    const gallery = {
      photos: req.body["gallery.photos"] ? [req.body["gallery.photos"]] : [],
      audios: req.body["gallery.audios"] ? [req.body["gallery.audios"]] : [],
      videos: req.body["gallery.videos"] ? [req.body["gallery.videos"]] : [],
    }

    // Verifica se nome e sobrenome foram informados
    if (!firstName || !lastName) {
      return res.status(400).render("errors/400", {
        message: "Nome e sobrenome são obrigatórios!",
      })
    }

    // Gera o slug baseado no nome e sobrenome
    const slug = `${firstName}-${lastName}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ç/g, "c")
      .replace(/\s+/g, "-")

    // Verifica se o memorial já existe
    try {
      const memorialExistente = await Memorial.findOne({ slug })
      if (memorialExistente) {
        return res.status(400).render("errors/400", {
          message: "Já existe um memorial com esse nome.",
        })
      }
      // Cria o memorial
      const memorial = new Memorial({
        user: userCurrent._id,
        firstName,
        lastName,
        slug,
        gender: gender, // || "Não informado",
        kinship: kinship, // || "Não informado",
        visibility: req.body.visibility || "public", // Usa o valor de visibilidade do formulário
        birth,
        death,
      })

      //console.log(memorial)
      await memorial.save()

      // Envia e-mail para o usuário
      await MailService.sendEmail({
        to: userCurrent.email,
        subject: "Seu memorial foi criado com sucesso",
        html: `
          <h1>Olá, ${userCurrent.firstName}</h1>
          <p>O memorial de <strong>${firstName} ${lastName}</strong> foi criado com sucesso.</p>
          <p>Você pode acessá-lo aqui: <a href="localhost:3000/memorial/${slug}">Ver memorial</a></p>
        `,
      })
      return res.redirect(`/memorial/${slug}/memorial-fet/edit`)
    } catch (error) {
      console.error("Erro ao criar memorial:", error)
      return res
        .status(500)
        .render("errors/500", { message: "Erro ao criar memorial." })
    }
  },

  // Método para exibir o memorial
  showMemorial: async (req, res) => {
    const { slug } = req.params
    try {
      // Atualiza visitas e popula os dados do memorial
      const memorial = await Memorial.findOneAndUpdate(
        { slug },
        { $inc: { visits: 1 } },
        { new: true }
      )
        .populate({ path: "user", select: "firstName lastName" })
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

      return res.render("memorial/memorial-about", {
        layout: "memorial-layout",
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

  // Método para exibir a página de edição do memorial
  editMemorial: async (req, res) => {
    try {
      //console.log("Recebendo requisição para editar memorial:", req.params.slug)

      const memorial = await Memorial.findOne({ slug: req.params.slug })
        .populate({ path: "user", select: "firstName lastName" })
        .populate({ path: "lifeStory", select: "title content" }) // Populate para lifeStory
        .populate({ path: "sharedStory", select: "title content" }) // Populate para sharedstory
        .lean() // Converte o documento em um objeto simples

      if (!memorial) {
        //console.log("Nenhum memorial encontrado com este slug")
        return res.status(404).send("Memorial não encontrado")
      }

      // Buscar as photos relacionados ao memorial
      const galeria = await Gallery.findOne({ memorial: memorial._id })
        .populate({ path: "user", select: "firstName lastName" })
        .select("photos audios videos")
        .lean() // Garantir que o resultado seja simples (não um documento Mongoose)

      // Se não houver galeria, inicializa com arrays vazios
      const galleryData = {
        memorial: galeria?.memorial || null,
        user: galeria?.user || null,
        photos: galeria?.photos || [],
        audios: galeria?.audios || [],
        videos: galeria?.videos || [],
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

      //console.log("Memorial encontrado:", memorial)
      //res.render("memorial/edit/personal", { memorial })
      return res.render("memorial/edit/memorial", {
        layout: "memorial-layout",
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        gender: memorial.gender,
        mainPhoto: memorial.mainPhoto,
        kinship: memorial.kinship,
        birth: {
          date: memorial.birth?.date
            ? new Date(memorial.birth.date).toISOString().split("T")[0]
            : "",
          //date: memorial.birth?.date || "Não informada", // Passa a data sem formatar
          city: memorial.birth?.city || "Local desconhecido",
          state: memorial.birth?.state || "Estado não informado",
          country: memorial.birth?.country || "País não informado",
        },
        death: {
          date: memorial.death?.date
            ? new Date(memorial.death.date).toISOString().split("T")[0]
            : "",

          //date: memorial.death?.date || "Não informada", // Passa a data sem formatar
          city: memorial.death?.city || "Local desconhecido",
          state: memorial.death?.state || "Estado não informado",
          country: memorial.death?.country || "País não informado",
        },
        about: memorial.about, // || "Informação não disponível.",
        epitaph: memorial.epitaph, // || "Nenhum epitáfio fornecido.",
        //tribute: memorial.tribute || [], // Passando os tributos para o template
        //lifeStory: Array.isArray(memorial.lifeStory) ? memorial.lifeStory : [],
        //stories: Array.isArray(memorial.stories) ? memorial.stories : [],
        //gallery: memorial.gallery || {
        //  photos: [],
        //  audios: [],
        //  videos: [],
        //},
        theme: memorial.theme || "Flores",
        gallery: galleryData,
        // Envia estatísticas específicas para a view
        estatisticas: {
          totalVisitas: memorial.visits || 0,
          totalTributos,
          totalHistorias,
          totalHistoriasCom,
        },
      })
    } catch (error) {
      //console.error("Erro ao carregar memorial para edição:", error)
      res.status(500).send("Erro interno do servidorrrrr")
    }
  },

  // Atualizar memorial
  updateMemorial: async (req, res) => {
    try {
      const { slug } = req.params
      //const { gender, relationship, birth, death } = req.body // Aqui você pode pegar os dados do formulário
      const updateData = req.body

      await Memorial.findOneAndUpdate({ slug: slug }, updateData, { new: true })

      /*
      // Lógica para encontrar e atualizar o memorial no banco
      const memorial = await Memorial.findOneAndUpdate(
        { slug: slug },
        { gender, relationship, birth, death },
        { new: true } // Retorna o memorial atualizado
      )
      */

      // Redirecionar ou exibir o memorial atualizado
      res.redirect(`/memorial/${slug}`) // Ou qualquer outro redirecionamento que faça sentido
    } catch (err) {
      console.error(err)
      res.status(500).send("Erro ao atualizar memorial")
    }
  },

  // Método para exibir a página de pesquisa por memorial
  // Método para exibir a página de pesquisa por memorial
  searchMemorial: async (req, res) => {
    const termo = req.query.q // Obtém o termo digitado na pesquisa
    const loggedUser = req.session.loggedUser // Obtém o usuário logado
    //console.log("loggedUser", loggedUser)

    if (!termo) {
      return res.render("memorial/memorial-pesquisa", {
        resultados: [],
        termo,
        loggedUser,
      })
    }

    try {
      const resultados = await Memorial.find({
        $or: [
          { firstName: { $regex: termo, $options: "i" } }, // Busca pelo primeiro nome (case-insensitive)
          { lastName: { $regex: termo, $options: "i" } }, // Busca pelo sobrenome (case-insensitive)
        ],
      }).lean() // Garante que os resultados sejam objetos simples

      // Converte o _id do usuário logado para string
      if (loggedUser && loggedUser._id) {
        loggedUser._id = loggedUser._id.toString()
      }

      // Converte todos os userId dos memoriais para string
      resultados.forEach((memorial) => {
        if (memorial.userId) {
          memorial.userId = memorial.userId.toString()
        }
      })

      res.render("memorial/memorial-pesquisa", {
        resultados,
        termo,
        loggedUser, // Passa o usuário logado para o template
      })

      //console.log("loggedUser (confirmado para template):", loggedUser)
    } catch (error) {
      console.error("Erro na pesquisa:", error)
      res
        .status(500)
        .render("errors/500", { message: "Erro ao realizar a pesquisa." })
    }
  },
  // Método para deletar memorial
  deleteMemorial: async (req, res) => {
    try {
      const { slug } = req.params

      //console.log("Recebendo requisição para deletar memorial:", slug)

      // Buscar memorial
      const memorial = await Memorial.findOne({ slug })
      if (!memorial) {
        return res.status(404).send("Memorial não encontrado.")
      }

      // (Opcional) Apagar as fotos e pastas
      const folderPath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "memorials",
        slug
      )
      if (fs.existsSync(folderPath)) {
        fs.rmSync(folderPath, { recursive: true, force: true })
        //console.log("Pasta do memorial apagada:", folderPath)
        //console.log("Pasta de fotos do memorial apagada.")
      }

      // Deletar o memorial do banco
      await Memorial.deleteOne({ slug })

      // Redirecionar para o dashboard
      res.redirect("/auth/dashboard")
    } catch (error) {
      console.error("Erro ao deletar memorial:", error)
      res.status(500).send("Erro ao deletar memorial.")
    }
  },
}

module.exports = MemorialController
