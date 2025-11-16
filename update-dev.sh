#!/bin/bash

# =============================================
# 🔄 Script de atualização do ambiente DEV
# Para: InMemoriamBrasil (Node.js + Mongo)
# Autor: Bontempo
# =============================================

# Caminho do projeto (ajuste se necessário)
PROJECT_DIR="/opt/docker/inmemoriambrasil"

# Nome do arquivo compose
COMPOSE_FILE="docker-compose.dev.yml"

# Nome do serviço Node.js
SERVICE_NAME="app"

echo "--------------------------------------------"
echo "🚀 Iniciando atualização do projeto InMemoriamBrasil"
echo "📁 Diretório: $PROJECT_DIR"
echo "📄 Compose: $COMPOSE_FILE"
echo "--------------------------------------------"

# Acessa o diretório do projeto
cd "$PROJECT_DIR" || { echo "❌ Erro: diretório não encontrado!"; exit 1; }

# Atualiza o código via Git
echo "🔄 Atualizando código com git pull..."
git pull origin main

# Reinicia apenas o serviço da aplicação
echo "♻️ Reiniciando container do serviço $SERVICE_NAME..."
docker compose -f "$COMPOSE_FILE" restart "$SERVICE_NAME"

# Exibe status após reinício
echo "--------------------------------------------"
docker compose -f "$COMPOSE_FILE" ps
echo "✅ Atualização concluída com sucesso!"
echo "--------------------------------------------"
