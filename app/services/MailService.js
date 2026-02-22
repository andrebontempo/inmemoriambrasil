const nodemailer = require("nodemailer")
const path = require("path")
const fs = require("fs-extra")
const handlebars = require("handlebars")

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

/**
 * Envia um e-mail utilizando um template Handlebars
 * @param {Object} options
 * @param {string} options.to - Destinatário
 * @param {string} options.subject - Assunto
 * @param {string} [options.templateName] - Nome do arquivo em app/templates/emails/ (sem .hbs)
 * @param {Object} [options.context] - Dados para o template
 * @param {string} [options.html] - HTML direto (fallback)
 */
async function sendEmail({ to, subject, templateName, context, html }) {
  try {
    let finalHtml = html

    if (templateName) {
      const templatePath = path.join(__dirname, "../templates/emails", `${templateName}.hbs`)
      const exists = await fs.pathExists(templatePath)

      if (exists) {
        const source = await fs.readFile(templatePath, "utf-8")
        const template = handlebars.compile(source)
        finalHtml = template(context || {})
      } else {
        console.warn(`⚠️ Template ${templateName} não encontrado em ${templatePath}`)
      }
    }

    const info = await transporter.sendMail({
      from: '"In Memoriam Brasil" <apoioaocliente@inmemoriambrasil.com.br>',
      to,
      subject,
      html: finalHtml,
    })

    return info
  } catch (error) {
    console.error("❌ Erro no MailService:", error)
    throw error
  }
}

module.exports = {
  sendEmail,
}
