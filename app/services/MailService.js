// app/services/MailService.js
const nodemailer = require("nodemailer")

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true, // true para 465, false para outras portas
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: '"In Memoriam Brasil" <apoioaocliente@inmemoriambrasil.com.br>',
      to,
      subject,
      html,
    })

    //console.log("E-mail enviado com sucesso:", info.messageId)
    return info
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error)
    throw error
  }
}

module.exports = {
  sendEmail,
}
