const { r2, DeleteObjectCommand } = require("../../config/r2")

async function deleteFromR2(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET, // usa o mesmo que já funciona no upload
      Key: key,
    })

    await r2.send(command)
    //console.log(`🗑️ Arquivo removido do R2: ${key}`)
    return true
  } catch (error) {
    console.error("❌ Erro ao remover do R2:", error)
    return false
  }
}

module.exports = { deleteFromR2 }
