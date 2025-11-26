const { sendEmail } = require("../services/MailService")

const EnvioContatoController = {
  envioContato: async (req, res) => {
    try {
      const { nome, email, assunto, mensagem } = req.body

      if (!nome || !email || !mensagem) {
        req.flash("error_msg", "Preencha todos os campos obrigatórios.")
        return res.redirect("/contato")
      }

      // HTML do e-mail
      const htmlEmail = `
  <div style="font-family: Arial, sans-serif; background-color:#f7f7f7; padding:20px;">
    <div style="max-width:600px; margin:0 auto; background:white; border-radius:8px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">

      <h2 style="color:#4f0e21; text-align:center; font-weight:700; margin-bottom:20px;">
        📩 Novo Contato Recebido
      </h2>

      <p style="font-size:15px; color:#333;">
        Você recebeu uma nova mensagem enviada pelo formulário de contato do site
        <strong>In Memoriam Brasil</strong>.
      </p>

      <div style="margin-top:20px;">
        <p><strong>👤 Nome:</strong> ${nome}</p>
        <p><strong>📧 E-mail:</strong> ${email}</p>
        <p><strong>📝 Assunto:</strong> ${assunto || "Não informado"}</p>
      </div>

      <div style="margin-top:25px;">
        <p style="font-weight:bold;">💬 Mensagem:</p>
        <div style="background:#faf0f4; padding:15px; border-left:4px solid #4f0e21; border-radius:4px; color:#333;">
          ${mensagem.replace(/\n/g, "<br>")}
        </div>
      </div>

      <hr style="margin-top:30px; border:0; border-top:1px solid #ddd;">

      <p style="font-size:12px; text-align:center; color:#777; margin-top:10px;">
        Este e-mail foi enviado automaticamente pelo site <strong>In Memoriam Brasil</strong>.<br>
        Por favor, não responda diretamente a esta mensagem.
      </p>

    </div>
  </div>
`

      // E-mail que você vai receber (destino)
      await sendEmail({
        to: "andre.lnx@gmail.com", // 📌 Troque se quiser enviar para outro
        subject: `📩 Contato do site: ${assunto || "Sem assunto"}`,
        html: htmlEmail,
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
