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
const { calcularIdade, formatDate } = require("../utils/helpers")
const MailService = require("../services/MailService")
const session = require("express-session")
//const { DeleteObjectCommand } = require("@aws-sdk/client-s3")
//const r2 = require("../../config/r2") // ajuste o caminho se diferente
//const { r2, PutObjectCommand } = require("../../config/r2")
const { r2, PutObjectCommand, DeleteObjectCommand } = require("../../config/r2")
const { deleteFromR2 } = require("../services/r2Delete")
const { generateQRCode } = require("../services/qrCode")

const MemorialController = {
  // 👉 Renderiza o formulário da etapa 1
  renderStep1: (req, res) => {
    res.render("memorial/create-step1", { activeCriar: true })
  },

  // 👉 Processa o envio do nome e sobrenome
  createStep1: async (req, res) => {
    try {
      //console.log(req.session.user)
      const userCurrent = req.session.user
      const { firstName, lastName } = req.body

      // ⚠️ (Opcional) Se quiser bloquear usuário não logado:
      /*
      if (!userCurrent) {
        return res.redirect("/auth/login")
      }
      */

      if (!firstName || !lastName) {
        return res.status(400).render("errors/400", {
          message: "Informe nome e sobrenome para continuar.",
        })
      }
      // ⚙️ Gera slug
      const slug = `${firstName.trim()}-${lastName.trim()}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/ç/g, "c")
        .replace(/\s+/g, "-") // troca espaços internos por -
        .replace(/[^a-z0-9-]/g, "") // opcional: remove caracteres especiais extra
        .replace(/-+/g, "-") // reduz múltiplos "----" para apenas "-"
        .replace(/^-|-$/g, "") // remove "-" no começo ou no final

      /* ⚙️ Gera slug (usando sua função)
      const slug = `${firstName}-${lastName}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "") // remove acentos
        .replace(/ç/g, "c")
        .replace(/\s+/g, "-")

      */
      // 🔎 Verifica se já existe
      const exists = await Memorial.findOne({ slug })
      if (exists) {
        return res.status(400).render("errors/400", {
          message: "Já existe um memorial com esse nome.",
        })
      }

      // 💾 Salva os dados temporariamente na sessão
      if (!req.session.memorial) req.session.memorial = {}

      req.session.memorial.firstName = firstName
      req.session.memorial.lastName = lastName
      req.session.memorial.slug = slug

      // 👉 Continua para o passo 2
      return res.redirect("/memorial/create-step2")
    } catch (err) {
      console.error("Erro na etapa 1:", err)
      return res.status(500).render("errors/500", {
        message: "Erro ao iniciar a criação do memorial.",
      })
    }
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
      country: req.body["birth.country"] || "Brasil",
    }

    // Ajusta o objeto `death` garantindo valores padrões
    const death1 = {
      date: req.body["death.date"] || null,
      city: req.body["death.city"] || "Local desconhecido",
      state: req.body["death.state"] || "Estado não informado",
      country: req.body["death.country"] || "Brasil",
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
    //console.log("Recebido do formulário:", req.body)

    const { plan } = req.body
    if (!req.session.memorial) return res.redirect("/memorial/create-step1")

    req.session.memorial.plan = plan

    return res.redirect("/memorial/create-step4")
  },

  renderStep4: (req, res) => {
    if (!req.session.memorial) {
      return res.redirect("/memorial/create-step1")
    }

    res.render("memorial/create-step4", {
      slug: req.session.memorial.slug, // Útil para preview
      memorial: req.session.memorial,
    })
  },
  createStep4: async (req, res) => {
    // Garantir login
    if (!req.session.user) {
      req.flash("error_msg", "Faça login para concluir a criação do memorial.")
      return res.redirect("/auth/login")
    }

    // Garantir sessão de memorial
    if (!req.session.memorial) {
      req.flash("error_msg", "Sessão expirada, comece novamente.")
      return res.redirect("/memorial/create-step1")
    }

    const userId = req.session.user._id
    const data = req.session.memorial
    //const user = req.session.user
    const userCurrent = req.session.user

    try {
      const { epitaph, theme } = req.body

      // Atualiza sessão
      req.session.memorial.epitaph = epitaph
      req.session.memorial.theme = theme

      // Foto opcional
      //console.log("req.file:", req.file)
      if (req.file && req.file.key) {
        req.session.memorial.mainPhoto = {
          key: req.file.key,
          url: req.file.url,
          originalName: req.file.originalname,
          updatedAt: new Date(),
        }
      }
      //console.log(
      //  "Dados finais do memorial na sessão:",
      //  req.session.memorial.mainPhoto.url
      //)

      // Agora cria oficialmente no banco
      const novoMemorial = await Memorial.create({
        ...req.session.memorial,
        owner: userId, // ✔️ CORRETO
      })

      // 🖼️ Criar galeria vazia automaticamente
      const novaGaleria = await Gallery.create({
        memorial: novoMemorial._id,
        user: userId,
        photos: [],
        audios: [],
        videos: [],
      })

      // 3️⃣ Atualizar memorial colocando a galeria
      await Memorial.findByIdAndUpdate(novoMemorial._id, {
        gallery: novaGaleria._id,
      })
      // gerar e salvar o QR Code automaticamente
      await generateQRCode(novoMemorial)
      // Guarda ID do memorial criado
      req.session.memorialId = novoMemorial._id

      // Envia e-mail para o usuário
      await MailService.sendEmail({
        to: userCurrent.email,
        subject: "Seu memorial foi criado com sucesso",
        html: `
  <div style="font-family: sans-serif; max-width: 600px; margin: auto; background: #f9f9f9; border-radius: 8px; padding: 20px; border: 1px solid #ddd;">
    <h2 style="color: #004085; text-align: center; margin-bottom: 20px;">
      🎉 Memorial criado com sucesso!
    </h2>

    <p style="font-size: 15px; color: #333;">
      Olá, <strong>${userCurrent.firstName}</strong>!
    </p>

    <p style="font-size: 15px; color: #333;">
      O memorial de <strong>${novoMemorial.firstName} ${novoMemorial.lastName}</strong> foi criado com sucesso no <strong>In Memoriam Brasil</strong>.
    </p>

    <p style="text-align: center; margin: 25px 0;">
      <a href="https://inmemoriambrasil.com.br/memorial/${novoMemorial.slug}"
        style="display: inline-block; background-color: #004085; color: #fff; padding: 12px 22px; text-decoration: none; border-radius: 5px; font-weight: bold;">
        ➤ Acessar o memorial
      </a>
    </p>

    <p style="font-size: 15px; color: #333;">
      Cuide das memórias de quem você ama com carinho e eternize histórias emocionantes.
    </p>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 25px 0;">

    <p style="font-size: 13px; color: #666; text-align: center;">
      Este e-mail foi enviado automaticamente pelo site In Memoriam Brasil.
    </p>
  </div>
`,
      })
      // Atualizar sessão
      req.session.memorialId = novoMemorial._id
      req.session.memorialSlug = novoMemorial.slug
      req.session.memorial = null // limpa os dados temporários

      // Redireciona para a página pública
      return res.redirect(`/memorial/${novoMemorial.slug}`)
    } catch (err) {
      console.error("Erro no step 4:", err)
      return res
        .status(500)
        .render("errors/500", { message: "Erro no passo final." })
    }
  },

  //ESTE MÉTODO NÃO ESTÁ SENDO USADO NO MOMENTO A CRIAÇÃO ESTÁ NO STEP4
  createMemorial: async (req, res) => {
    try {
      const user = req.session.user
      const data = req.session.memorial

      if (!user || !data) return res.redirect("/memorial/create-step1")

      // ⚙️ Gera slug
      const slug = `${firstName.trim()}-${lastName.trim()}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/ç/g, "c")
        .replace(/\s+/g, "-") // troca espaços internos por -
        .replace(/[^a-z0-9-]/g, "") // opcional: remove caracteres especiais extra
        .replace(/-+/g, "-") // reduz múltiplos "----" para apenas "-"
        .replace(/^-|-$/g, "") // remove "-" no começo ou no final

      // Verifica duplicidade
      const exists = await Memorial.findOne({ slug })
      if (exists) {
        return res.status(400).render("errors/400", {
          message: "Já existe um memorial com esse nome.",
        })
      }

      // Cria memorial completo
      const memorial = new Memorial({
        user: user._id,
        firstName: data.firstName,
        lastName: data.lastName,
        slug,
        plan: data.plan,
        gender: data.gender,
        kinship: data.kinship,
        visibility: data.visibility || "public",
        birth: data.birth,
        death: data.death,
        mainPhoto: data.mainPhoto || null,
        epitaph: data.epitaph,
        theme: data.theme,
      })

      await memorial.save()

      // E-mail de confirmação
      await MailService.sendEmail({
        to: user.email,
        subject: "Seu memorial foi criado com sucesso",
        html: `<p>O memorial de <strong>${data.firstName} ${data.lastName}</strong> foi criado!</p>`,
      })

      // Limpa sessão
      req.session.memorial = null
      req.session.memorialId = memorial._id

      return res.redirect(`/memorial/${slug}/memorial-fet/edit`)
    } catch (err) {
      console.error("Erro ao criar memorial:", err)
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

      return res.render("memorial/memorial-about", {
        layout: "memorial-layout",
        owner: memorial.owner,
        activeAbout: true,
        firstName: memorial.firstName,
        lastName: memorial.lastName,
        slug: memorial.slug,
        id: memorial._id,
        gender: memorial.gender,
        kinship: memorial.kinship,
        biography: memorial.biography,
        obituary: memorial.obituary,
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

  // Método para exibir a página de edição do memorial
  editMemorial: async (req, res) => {
    try {
      //console.log("Recebendo requisição para editar memorial:", req.params.slug)

      const memorial = await Memorial.findOne({ slug: req.params.slug })
        .populate({ path: "owner", select: "firstName lastName" })
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
    const termo = req.query.q // termo digitado
    const user = req.session.user

    // Se não houver termo e nem "*", não busca nada ainda
    if (!termo) {
      return res.render("memorial/memorial-pesquisa", {
        resultados: [],
        termo,
        user,
      })
    }

    try {
      let resultados = []

      // 🔎 Se termo for "*", busca TODOS
      if (termo === "*") {
        resultados = await Memorial.find().lean()
      } else {
        // Busca por nome/ sobrenome
        resultados = await Memorial.find({
          $or: [
            { firstName: { $regex: termo, $options: "i" } },
            { lastName: { $regex: termo, $options: "i" } },
          ],
        }).lean()
      }

      // Converter IDs para string (garante comparação)
      if (user && user._id) {
        user._id = user._id.toString()
      }
      resultados.forEach((memorial) => {
        if (memorial.userId) {
          memorial.userId = memorial.userId.toString()
        }
      })

      res.render("memorial/memorial-pesquisa", {
        resultados,
        termo,
        user,
      })
    } catch (error) {
      console.error("Erro na pesquisa:", error)
      res
        .status(500)
        .render("errors/500", { message: "Erro ao realizar a pesquisa." })
    }
  },
  // Método para deletar memorial
  // 👉 Apaga memorial e todos os recursos associados
  deleteMemorial: async (req, res) => {
    try {
      const { slug } = req.params
      const memorial = await Memorial.findOne({ slug })
      if (!memorial) return res.status(404).send("Memorial não encontrado.")

      const memorialId = memorial._id

      /* 🖼️ 1) Deletar imagem principal no R2 */
      if (memorial.mainPhoto?.key) {
        await deleteFromR2(memorial.mainPhoto.key)
      }
      /* 🧾 1b) Deletar QR Code no R2 */
      if (memorial.qrCode?.key) {
        await deleteFromR2(memorial.qrCode.key)
      }

      /* 📚 2) Deletar todas as LifeStories */
      const lifeStories = await LifeStory.find({ memorial: memorialId })
      for (const life of lifeStories) {
        if (life.image?.key) await deleteFromR2(life.image.key)
      }
      await LifeStory.deleteMany({ memorial: memorialId })

      /* 🤝 3) Deletar todas as SharedStories */
      const sharedStories = await SharedStory.find({ memorial: memorialId })
      for (const shared of sharedStories) {
        if (shared.image?.key) await deleteFromR2(shared.image.key)
      }
      await SharedStory.deleteMany({ memorial: memorialId })

      /* 🖼️📸 4) Deletar Galeria COMPLETA (fotos, áudios e vídeos) */
      const gallery = await Gallery.findOne({ memorial: memorialId })

      if (gallery) {
        // Fotos
        if (gallery.photos?.length) {
          for (const photo of gallery.photos) {
            if (photo?.key) await deleteFromR2(photo.key)
          }
        }

        // Áudios
        if (gallery.audios?.length) {
          for (const audio of gallery.audios) {
            if (audio?.key) await deleteFromR2(audio.key)
          }
        }

        // Vídeos
        if (gallery.videos?.length) {
          for (const video of gallery.videos) {
            if (video?.key) await deleteFromR2(video.key)
          }
        }

        // Deletar documento da Gallery
        await Gallery.deleteOne({ _id: gallery._id })
      }

      /* 💐 5) Apagar tributos */
      await Tribute.deleteMany({ memorial: memorialId })

      /* 🪦 6) Finalmente apagar o memorial */
      await Memorial.deleteOne({ _id: memorialId })

      /* 🎉 Finalizar */
      req.flash("success_msg", "Memorial apagado com sucesso.")
      return res.redirect("/auth/dashboard")
    } catch (err) {
      console.error("❌ Erro ao deletar memorial:", err)
      return res.status(500).send("Erro ao deletar memorial.")
    }
  },
}

module.exports = MemorialController
