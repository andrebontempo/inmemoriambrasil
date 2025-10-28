const mongoose = require("mongoose")

const TributeSchema = new mongoose.Schema(
  {
    // Referência ao Memorial ao qual este tributo pertence (Obrigatório)
    memorial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Memorial",
      required: true,
    },

    // Referência ao usuário que criou o tributo (Obrigatório)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Nome do usuário que criou o tributo (pode ser obtido do modelo User)
    name: { type: String, required: false, trim: true },

    // Mensagem opcional deixada pelo usuário
    message: {
      type: String,
      trim: true,
      validate: {
        // Se o tributo for do tipo "mensagem", então a mensagem é obrigatória
        validator: function (value) {
          return this.type !== "mensagem" || (value && value.trim().length > 0)
        },
        message: "Mensagens devem conter texto.",
      },
    },

    // Tipo de tributo: pode ser "vela", "flor" ou "mensagem"
    type: {
      type: String,
      enum: ["tributo_caneta.png", "tributo_vela.png", "tributo_flor.png"],
      required: true,
      default: "tributo_caneta.png", // Se nenhum tipo for informado, assume "mensagem"
    },

    // Caminho da imagem associada ao tributo (opcional)
    image: { type: String, default: "" },
  },
  { timestamps: true } // Adiciona automaticamente os campos createdAt e updatedAt
)

// Índice no MongoDB para melhorar a performance ao buscar tributos de um memorial
TributeSchema.index({ memorial: 1 })

module.exports = mongoose.model("Tribute", TributeSchema)
// O modelo Tribute representa um tributo deixado por um usuário em um memorial.
// Ele contém informações sobre o memorial, o usuário que deixou o tributo,
// a mensagem (se houver), o tipo de tributo e a imagem associada.
// O esquema também define um índice para otimizar as consultas ao banco de dados
// quando procuramos tributos relacionados a um memorial específico.
// O campo "timestamps" adiciona automaticamente os campos "createdAt" e "updatedAt"
// para rastrear quando o tributo foi criado e atualizado pela última vez.
// O campo "memorial" é uma referência ao modelo "Memorial", enquanto o campo "user"
// é uma referência ao modelo "User".
// O campo "name" armazena o nome do usuário que criou o tributo.
// O campo "message" é opcional e contém a mensagem deixada pelo usuário.
// O campo "type" define o tipo de tributo, que pode ser uma caneta, vela ou flor.
// O campo "image" armazena o caminho da imagem associada ao tributo, se houver.
// O modelo é exportado para ser utilizado em outras partes da aplicação.
