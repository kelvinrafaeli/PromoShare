#!/bin/bash

# Define o caminho do projeto
DIR="/root/PromoShare"

echo "🚀 Iniciando Deploy (Arquitetura Segura - Python Backend)..."

# 1. Garante que está na pasta certa e atualiza o Git
cd $DIR
echo "📥 Baixando atualizações do Git..."
git fetch --all
git reset --hard origin/main

# 2. Build do React para ser servido pelo Nginx
echo "🏗️  Gerando build do React..."
rm -rf dist node_modules package-lock.json # Limpeza
npm install
npm run build

# 3. Sobe a infraestrutura com Docker-Compose ou Docker Compose (v2)
echo "🐳 Subindo containers (Frontend + Backend)..."

# Limpa containers antigos para evitar erros de conflito de nome
docker rm -f promoshare-app promoshare-api 2>/dev/null

if command -v docker-compose &> /dev/null
then
    docker-compose up -d --build
else
    echo "⚠️  docker-compose não encontrado, tentando 'docker compose'..."
    docker compose up -d --build
fi

# 4. Limpeza de imagens antigas (opcional)
docker image prune -f

echo "✅ Sucesso! Sistema atualizado e seguro."
echo "🌐 Frontend: porta 8091"
echo "🔐 Backend: porta 8000 (interno)"
