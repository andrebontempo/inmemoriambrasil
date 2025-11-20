const { PutObjectCommand } = require("@aws-sdk/client-s3")
const r2Client = require("../services/r2Service")
const path = require("path")

async function uploadToR2(fileBuffer, mimetype, memorialId, folder = "photos") {
  const extension = mimetype.split("/")[1]
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`
  const filePath = `${folder}/${memorialId}/${fileName}`

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: filePath,
    Body: fileBuffer,
    ContentType: mimetype,
  })

  await r2Client.send(command)

  return `${process.env.R2_PUBLIC_URL}/${filePath}`
}

module.exports = { uploadToR2 }
