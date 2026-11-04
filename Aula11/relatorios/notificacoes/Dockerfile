# Build em dois estágios: o primeiro compila o TypeScript, o segundo leva só
# o JavaScript compilado e as dependências de produção (imagem menor).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
USER node
# `node` direto (sem npm) para o processo receber o SIGTERM do `docker stop`
# e conseguir sair do grupo de consumidores do Kafka de forma limpa.
# O --disable-warning esconde um aviso inofensivo do kafkajs no Node >= 23.
CMD ["node", "--disable-warning=TimeoutNegativeWarning", "dist/index.js"]
