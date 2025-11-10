#!/bin/bash

echo "🚀 Atualizando aplicação In Memoriam Brasil..."

# 1️⃣ Atualiza código do repositório
git pull

# 2️⃣ Derruba containers antigos
docker compose down

# 3️⃣ Rebuilda imagem sem cache
docker compose build --no-cache

# 4️⃣ Sobe o app novamente
docker compose up -d

# 5️⃣ Mostra status
docker compose ps

echo "✅ Deploy concluído com sucesso!"
