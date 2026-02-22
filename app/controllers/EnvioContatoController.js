const { sendEmail } = require("../services/MailService")

const EnvioContatoController = {
  envioContato: async (req, res) => {
    try {
      const { nome, email, assunto, mensagem } = req.body

      if (!nome || !email || !mensagem) {
        req.flash("error_msg", "Preencha todos os campos obrigatórios.")
        return res.redirect("/contato")
      }

      // E-mail que você vai receber (destino)
      await sendEmail({
        to: "andre.lnx@gmail.com",
        subject: `📩 Contato do site: ${assunto || "Sem assunto"}`,
        templateName: "contact",
        context: {
          name: nome,
          email: email,
          subject: assunto || "Não informado",
          message: mensagem
        }
      })

      req.flash(
        "success_msg",
        "Mensagem enviada com sucesso! Em breve entraremos em contato."
      )
      return res.redirect("/contato")
    } catch (error) {
      console.error("Erro ao enviar contato:", error)
      req.flash(
        "error_msg",
        "Ocorreu um erro ao enviar sua mensagem. Tente novamente mais tarde."
      )
      return res.redirect("/contato")
    }
  },
}

module.exports = EnvioContatoController
