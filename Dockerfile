# Usa imagem oficial do Node
FROM node:20-alpine

# Cria diretório da aplicação dentro do container
WORKDIR /usr/src/app

# Copia os arquivos de dependências primeiro (para cache de build)
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm install --production

# Copia o restante do código para o container
COPY . .

# Define a variável de ambiente para produção
ENV NODE_ENV=production

# Expõe a porta usada pela aplicação
EXPOSE 3051

# Comando para iniciar o app
CMD ["node", "server.js"]
