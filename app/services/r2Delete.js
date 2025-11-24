const { r2Client, bucketName } = require("../../config/r2")
const { DeleteObjectCommand } = require("@aws-sdk/client-s3")

async function deleteFromR2(key) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
    await r2Client.send(command)
    console.log(`🗑️ Arquivo removido do R2: ${key}`)
    return true
  } catch (error) {
    console.error("❌ Erro ao remover do R2:", error)
    return false
  }
}

module.exports = { deleteFromR2 }
