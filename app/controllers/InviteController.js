// controllers/memorialController.js
const MailService = require("../services/MailService")
const Memorial = require("../models/Memorial")

const InviteController = {
  sendInvite: async (req, res) => {
    const { slug } = req.params
    const { email } = req.body

    try {
      const memorial = await Memorial.findOne({ slug })

      if (!memorial) {
        req.flash("error_msg", "Memorial não encontrado.")
        return res.redirect("/")
      }

      const link = `https://inmemoriambrasil.com.br/memorial/${slug}`

      await MailService.sendEmail({
        to: email,
        subject: "Convite para visitar um memorial",
        templateName: "invite",
        context: {
          memorialName: `${memorial.firstName} ${memorial.lastName}`,
          link
        }
      })

      req.flash("success_msg", "Convite enviado com sucesso!")
      res.redirect(`/memorial/${slug}`)
    } catch (err) {
      console.error(err)
      req.flash("error_msg", "Erro ao enviar o convite.")
      res.redirect(`/memorial/${slug}`)
    }
  },
}

module.exports = InviteController
