require("dotenv").config() // Importa o dotenv
const mongoose = require("mongoose")

const conectarDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI) // Usa a variável do .env
    console.log("✅ MongoDB conectado!")
  } catch (error) {
    console.error("❌ Erro na conexão com o MongoDB:", error)
    process.exit(1)
  }
}

// Eventos para monitorar o estado da conexão
mongoose.connection.on("error", (err) => {
  console.error("❌ Erro na conexão com o MongoDB:", err)
})

mongoose.connection.on("disconnected", () => {
  console.log("⚠️ MongoDB desconectado. Tentando reconectar...")
})

// Fecha a conexão ao interromper o servidor
process.on("SIGINT", async () => {
  await mongoose.connection.close()
  console.log(
    "⚠️ Conexão com o MongoDB fechada devido à interrupção do servidor"
  )
  process.exit(0)
})

module.exports = conectarDB
