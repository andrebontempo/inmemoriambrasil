const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3")

const r2Client = new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY,
        secretAccessKey: process.env.R2_SECRET_KEY,
    },
})

/**
 * Faz upload de um buffer para o R2
 */
async function uploadToR2(fileBuffer, mimetype, key) {
    const command = new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: mimetype,
    })

    await r2Client.send(command)

    return {
        key,
        url: `${process.env.R2_PUBLIC_URL}/${key}`
    }
}

/**
 * Remove um objeto do R2
 */
async function deleteFromR2(key) {
    if (!key) return false

    try {
        const command = new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET,
            Key: key,
        })

        await r2Client.send(command)
        return true
    } catch (error) {
        console.error("❌ Erro ao remover do R2:", error)
        return false
    }
}

module.exports = {
    r2Client,
    uploadToR2,
    deleteFromR2,
    PutObjectCommand,
    DeleteObjectCommand
}
