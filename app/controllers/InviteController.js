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
  <div style="font-family: Arial, Helvetica, sans-serif; background-color: #f6f3f4; padding: 20px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 20px; border: 1px solid #e5d5da;">

      <h2 style="text-align: center; color: #551a2b; border-bottom: 2px solid #e3cdd4; padding-bottom: 10px; margin-bottom: 25px;">
        Você foi convidado para acessar um memorial
      </h2>

      <p style="font-size: 15px; color: #444; line-height: 1.5;">Olá,</p>

      <p style="font-size: 15px; color: #444; line-height: 1.5;">
        Você recebeu um convite para visitar o memorial de
        <strong style="color: #551a2b;">${memorial.firstName} ${memorial.lastName}</strong>
        no site <strong>In Memoriam Brasil</strong>.
      </p>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${link}"
          style="display: inline-block; background-color: #551a2b; color: #fff; padding: 12px 22px;
          font-weight: bold; font-size: 15px; border-radius: 6px; text-decoration: none;">
          Acessar o memorial
        </a>
      </div>

      <p style="font-size: 14px; color: #555; line-height: 1.5;">
        Com carinho,<br>
        <strong>Equipe In Memoriam Brasil</strong>
      </p>

      <hr style="margin-top: 30px; border: none; border-top: 1px solid #e3cdd4;">
      <p style="font-size: 12px; color: #777; text-align: center;">
        Este e-mail foi enviado automaticamente pelo site In Memoriam Brasil.
      </p>

    </div>
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
