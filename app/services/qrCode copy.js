const QRCode = require("qrcode")
const { putObject } = require("../../config/r2") // seu serviço R2

async function generateQRCode(memorial) {
  const qrTargetUrl = `https://seusite.com/m/${memorial.slug}`

  // Gera o QR em buffer
  const buffer = await QRCode.toBuffer(qrTargetUrl)

  // Caminho no R2
  const key = `memorials/${memorial.slug}/qrcode.png`

  // Faz upload
  await putObject({
    Key: key,
    Body: buffer,
    ContentType: "image/png",
  })

  // Atualiza o memorial
  memorial.qrCode = {
    key,
    url: `https://SEU_BUCKET_PUBLIC_URL/${key}`,
    updatedAt: new Date(),
  }

  await memorial.save()

  return memorial.qrCode.url
}

module.exports = { generateQRCode }
