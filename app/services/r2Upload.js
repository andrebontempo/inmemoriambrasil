const { PutObjectCommand } = require("@aws-sdk/client-s3")
const r2 = require("../../config/r2")

async function uploadToR2(file, folder = "lifestory") {
  const key = `${folder}/${Date.now()}-${file.originalname}`

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    })
  )

  return {
    key,
    url: `${process.env.R2_PUBLIC_URL}/${key}`,
    originalName: file.originalname,
  }
}

module.exports = uploadToR2
