const mongoose = require("mongoose")

const MemorialSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Criador do memorial
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    gender: { type: String },
    kinship: { type: String },

    // Foto principal
    mainPhoto: {
      url: { type: String, required: false },
      updatedAt: { type: Date, default: Date.now },
    },

    // Tema e plano - No futuro, serão ~40 opções
    theme: {
      type: String,
      enum: ["Vinho", "Roxo", "Azul"],
      default: "Vinho",
    },
    plan: {
      type: String,
      enum: ["free", "premium"],
      default: "free",
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
      country: { type: String },
    },

    // **Informações de falecimento**
    death: {
      date: { type: Date, required: true },
      city: { type: String },
      state: { type: String },
      country: { type: String },
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
      photos: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Gallery",
        },
      ],
      audios: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Gallery",
        },
      ],
      videos: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Gallery",
        },
      ],
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

// Middleware para registrar atualizações no memorial
MemorialSchema.pre("save", function (next) {
  if (this.isNew) {
    return next() // Se for um novo documento, não precisa registrar mudanças
  }

  const updateLogs = this.updateLogs || []

  // Verifica cada campo do schema para ver se foi modificado
  this.modifiedPaths().forEach((field) => {
    if (field !== "updateLogs") {
      updateLogs.push({
        field,
        oldValue: this.get(field), // Valor antes da alteração
        newValue: this[field], // Novo valor
        updatedAt: Date.now(),
      })
    }
  })

  this.updateLogs = updateLogs
  next()
})

module.exports = mongoose.model("Memorial", MemorialSchema)
