const Memorial = require("../models/Memorial")
const Gallery = require("../models/Gallery")
const Tribute = require("../models/Tribute")
const LifeStory = require("../models/LifeStory")
const SharedStory = require("../models/SharedStory")
const MailService = require("./MailService")
const { deleteFromR2 } = require("./R2Service")
const { generateQRCode } = require("./QRCodeService")

/**
 * Service para encapsular lógica de negócios relacionada a Memoriais.
 */
const MemorialService = {
  /**
   * Gera um slug único baseado no nome e sobrenome.
   * @param {string} firstName
   * @param {string} lastName
   * @returns {Promise<string>} Slug único gerado
   */
  generateUniqueSlug: async (firstName, lastName) => {
    let slug = `${firstName.trim()}-${lastName.trim()}`
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/ç/g, "c")
      .replace(/\s+/g, "-") // troca espaços internos por -
      .replace(/[^a-z0-9-]/g, "") // remove caracteres especiais
      .replace(/-+/g, "-") // reduz múltiplos hífenes
      .replace(/^-|-$/g, "") // remove hífen no início/fim

    // Verifica duplicidade e adiciona sufixo se necessário
    // OBS: A lógica original apenas rejeitava se existisse.
    // Aqui vamos manter o comportamento de verificar se existe para o Controller decidir,
    // ou podemos retornar o slug limpo para verificação.
    // Para manter fidelidade à regra atual: retornaremos apenas o slug formatado.
    return slug
  },

  /**
   * Verifica se já existe um memorial com este slug.
   * @param {string} slug
   * @returns {Promise<boolean>}
   */
  checkSlugExists: async (slug) => {
    const exists = await Memorial.findOne({ slug })
    return !!exists
  },

  /**
   * Cria o contexto completo de um memorial (Memorial + Galeria + QRCode + Email).
   * @param {Object} data - Dados do memorial (session.memorial)
   * @param {Object} user - Usuário criador (session.user)
   * @returns {Promise<Object>} O documento do memorial criado
   */
  createMemorialContext: async (data, user) => {
    // 1. Cria o memorial no banco
    const memorial = await Memorial.create({
      ...data,
      owner: user._id,
    })

    // 2. Cria galeria vazia
    const gallery = await Gallery.create({
      memorial: memorial._id,
      user: user._id,
      photos: [],
      audios: [],
      videos: [],
    })

    // 3. Atualiza memorial com referência da galeria
    await Memorial.findByIdAndUpdate(memorial._id, {
      gallery: gallery._id,
    })

    // 4. Gera e salva QR Code
    await generateQRCode(memorial)

    // 5. Envia e-mail de confirmação
    // Nota: O HTML do e-mail poderia ser extraído para um template builder separado futuramente
    await MailService.sendEmail({
      to: user.email,
      subject: "Seu memorial foi criado com sucesso",
      templateName: "memorialCreated",
      context: {
        userName: user.firstName,
        memorialName: `${memorial.firstName} ${memorial.lastName}`,
        link: `https://inmemoriambrasil.com.br/memorial/${memorial.slug}`
      }
    })

    return memorial
  },

  /**
   * Remove completamente um memorial e todos os recursos associados.
   * @param {string} slug
   */
  deleteMemorialResources: async (slug) => {
    const memorial = await Memorial.findOne({ slug })
    if (!memorial) throw new Error("Memorial não encontrado.")

    const memorialId = memorial._id

    // 1. Deletar arquivos do Memorial (Foto Principal, QRCode)
    if (memorial.mainPhoto?.key) await deleteFromR2(memorial.mainPhoto.key)
    if (memorial.qrCode?.key) await deleteFromR2(memorial.qrCode.key)

    // 2. Deletar LifeStories (Arquivos e Docs)
    const lifeStories = await LifeStory.find({ memorial: memorialId })
    for (const life of lifeStories) {
      if (life.image?.key) await deleteFromR2(life.image.key)
    }
    await LifeStory.deleteMany({ memorial: memorialId })

    // 3. Deletar SharedStories (Arquivos e Docs)
    const sharedStories = await SharedStory.find({ memorial: memorialId })
    for (const shared of sharedStories) {
      if (shared.image?.key) await deleteFromR2(shared.image.key)
    }
    await SharedStory.deleteMany({ memorial: memorialId })

    // 4. Deletar Galeria (Fotos, Áudios, Vídeos e Doc)
    const gallery = await Gallery.findOne({ memorial: memorialId })
    if (gallery) {
      if (gallery.photos?.length) {
        for (const photo of gallery.photos) if (photo?.key) await deleteFromR2(photo.key)
      }
      if (gallery.audios?.length) {
        for (const audio of gallery.audios) if (audio?.key) await deleteFromR2(audio.key)
      }
      if (gallery.videos?.length) {
        for (const video of gallery.videos) if (video?.key) await deleteFromR2(video.key)
      }
      await Gallery.deleteOne({ _id: gallery._id })
    }

    // 5. Deletar Tributos
    await Tribute.deleteMany({ memorial: memorialId })

    // 6. Deletar o Memorial
    await Memorial.deleteOne({ _id: memorialId })

    return true
  }
}

module.exports = MemorialService
