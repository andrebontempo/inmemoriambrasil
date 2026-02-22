// 🔗 Conectar ao database
use("inmemoriambrasilBD")

// 1) 👉 Mostrar índices atuais
console.log("📌 Índices atuais:")
db.memorials.getIndexes()

// 2) 👉 Remover o índice existente (se houver)
try {
  const result = db.memorials.dropIndex("slug_1")
  console.log("🗑️ Índice slug_1 removido:", result)
} catch (err) {
  console.log("⚠️ Índice slug_1 não existia ou já foi removido.")
}

// 3) 👉 Criar índice novo, agora com unique
db.memorials.createIndex({ slug: 1 }, { unique: true })

console.log("✅ Novo índice único slug_1 criado com sucesso!")
