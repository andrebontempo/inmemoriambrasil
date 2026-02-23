const mongoose = require("mongoose")

const MemorialSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Criador do memorial

    collaborators: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ], // edição

    invited: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    ], // leitura (private_read)

    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    gender: { type: String },
    kinship: { type: String },
    biography: {
      type: String,
      default: "",
    },
    obituary: {
      type: new mongoose.Schema({
        cemetery: { type: String, default: null },
        graveAddress: { type: String, default: null },
        wakeLocation: { type: String, default: null },
        wakeDate: { type: Date, default: null },
        wakeStart: { type: String, default: null },
        wakeEnd: { type: String, default: null },
        cemeteryMap: { type: String, default: null },
      }, { _id: false }),
      default: null
    },
    accessLevel: {
      type: String,
      enum: ["public_read", "private_read", "private_edit"],
      default: "public_read",
    },
    mainPhoto: {
      key: { type: String }, // <- Caminho do arquivo no Bucket (R2)
      url: { type: String }, // <- URL pública
      originalName: { type: String },
      updatedAt: { type: Date, default: Date.now },
    },
    qrCode: {
      key: { type: String },
      url: { type: String },
      updatedAt: { type: Date, default: Date.now },
    },
    // Tema e plano - No futuro, serão ~40 opções
    theme: {
      type: String,
      enum: ["vinho", "roxo", "azul"],
      default: "vinho",
    },
    plan: {
      type: String,
      enum: ["base", "premium"],
      default: "base",
    },
    planDetails: {
      expirationDate: { type: Date }, // Data de vencimento do plano premium
      amountPaid: { type: Number }, // Valor pago (se aplicável)
      isPaid: { type: Boolean, default: false }, // Se o pagamento foi concluído
    },

    // **Epitáfio** - Agora com valor default
    epitaph: {
      type: String,
      maxlength: 255,
      default: "",
    },
    epitaphTimestamp: { type: Date, default: Date.now },

    // **Sobre o memorial** - Agora com valor default
    about: {
      type: String,
      default: "",
    },
    aboutTimestamp: { type: Date, default: Date.now },

    // **Informações de nascimento**
    birth: {
      date: { type: Date, required: true },
      city: { type: String },
      state: { type: String },
      country: { type: String, default: "Brasil" },
    },

    // **Informações de falecimento**
    death: {
      date: { type: Date, required: true },
      city: { type: String },
      state: { type: String },
      country: { type: String, default: "Brasil" },
    },


    // **Campo tribute**: Referência para a coleção Tribute
    tribute: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tribute",
      },
    ],

    // **Campo lifeStory**: Referência para a coleção LifeStory
    lifeStory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LifeStory",
      },
    ],

    // **Campo stories**: Referência para a coleção Story
    sharedStory: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SharedStory",
      },
    ],

    // **Campo gallery**: Referência para a coleção Gallery
    gallery: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gallery",
    },

    // **Campo visits**: Contador de visitas
    visits: { type: Number, default: 0 },

    // Logs de atualização
    updateLogs: [
      {
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        updatedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
)

// Índice de Texto para busca performática (com suporte a português para ignorar acentos)
MemorialSchema.index(
  { firstName: "text", lastName: "text" },
  { default_language: "portuguese" }
)

// Middleware para registrar atualizações no memorial
MemorialSchema.pre("save", function (next) {
  // Se é novo -> não loga nada
  if (this.isNew) {
    return next()
  }

  const updateLogs = this.updateLogs || []

  this.modifiedPaths().forEach((field) => {
    if (field === "updateLogs") return // ignorar

    const oldValue = this.get(field)
    const newValue = this[field]

    // Só registra se realmente mudou
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      updateLogs.push({
        field,
        oldValue,
        newValue,
        updatedAt: Date.now(),
      })
    }
  })

  this.updateLogs = updateLogs
  next()
})

module.exports = mongoose.model("Memorial", MemorialSchema)
