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

      const html = `
      <div style="font-family: sans-serif;">
        <h2>Você foi convidado para visitar um memorial</h2>
        <p>Olá,</p>
        <p>Você recebeu um convite para visitar o memorial de <strong>${memorial.firstName} ${memorial.lastName}</strong> no site <strong>In Memoriam Brasil</strong>.</p>
        <p>
          <a href="${link}" style="display: inline-block; background-color: #004085; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            Acessar o memorial
          </a>
        </p>
        <p>Com carinho,</p>
        <p>Equipe In Memoriam Brasil</p>
      </div>
    `

      await MailService.sendEmail({
        to: email,
        subject: "Convite para visitar um memorial",
        html,
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
