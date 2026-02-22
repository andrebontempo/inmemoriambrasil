// app/services/QRCodeService.js
const QRCode = require("qrcode")
const { r2Client: r2, PutObjectCommand } = require("./R2Service")

/**
 * Gera um QR code para o memorial (usa memorial.slug) e envia para o R2.
 * @param {Object} memorial - documento mongoose (pode ser o retorno de create())
 * @returns {string} url pública do QR gerado
 */
async function generateQRCode(memorial) {
  if (!memorial || !memorial.slug) {
    throw new Error("Memorial inválido ou sem slug.")
  }

  try {
    const qrTargetUrl = `https://inmemoriambrasil.com.br/memorial/${memorial.slug}` // ajuste se necessário

    // gera buffer do QR (PNG)
    const buffer = await QRCode.toBuffer(qrTargetUrl, {
      type: "png",
      width: 400,
    })

    // define a key no R2
    const key = `memorials/${memorial.slug}/qrcode.png`

    // comando para enviar ao R2
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: "image/png",
      // Opcional: ACL/public-read não aplicável ao R2, depende do bucket settings
    })

    await r2.send(command)

    // monta URL pública:
    // Preferência: defina process.env.R2_PUBLIC_URL = "https://pub-XXXXX.r2.dev"
    let publicBase = process.env.R2_PUBLIC_URL || process.env.R2_PUBLIC_BASE
    let publicUrl
    if (publicBase) {
      publicBase = publicBase.replace(/\/$/, "")
      publicUrl = `${publicBase}/${key}`
    } else if (
      process.env.R2_ENDPOINT &&
      process.env.R2_ENDPOINT.includes(".r2.dev")
    ) {
      // fallback: caso R2_ENDPOINT seja algo como https://pub-...r2.dev
      publicUrl = `${process.env.R2_ENDPOINT.replace(/\/$/, "")}/${key}`
    } else {
      console.warn(
        "[qrCode] Não encontrei R2_PUBLIC_URL. Defina R2_PUBLIC_URL no .env com o domínio público (ex: https://pub-XXX.r2.dev)."
      )
      // ainda assim, devolve uma URL relativa que você pode usar para debug
      publicUrl = `${key}`
    }

    // atualiza o memorial no banco (se for um documento mongoose)
    // se for apenas id, busque antes e atualize
    if (typeof memorial.save === "function") {
      memorial.qrCode = {
        key,
        url: publicUrl,
        updatedAt: new Date(),
      }
      await memorial.save()
    } else if (memorial._id) {
      // caso você passe um objeto plain com _id
      const Memorial = require("../models/Memorial")
      await Memorial.findByIdAndUpdate(memorial._id, {
        qrCode: { key, url: publicUrl, updatedAt: new Date() },
      })
    }

    return publicUrl
  } catch (err) {
    console.error("Erro ao gerar/upload do QR Code:", err)
    throw err
  }
}

module.exports = { generateQRCode }
