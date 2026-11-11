# syntax=docker/dockerfile:1.7
#
# Build em ESTÁGIOS (multi-stage). Cada FROM começa do zero e só leva adiante
# o que o próximo estágio copia com `COPY --from`. A imagem final não tem
# compilador, devDependencies, testes nem código-fonte TypeScript.
#
#   deps       → todas as dependências (inclusive dev)         [cache]
#   build      → compila TypeScript → dist/
#   test       → `docker build --target test` roda os testes unitários no build
#   prod-deps  → só as dependências de produção                [cache]
#   runtime    → imagem final (a que vai para produção)

ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
# Copiar SÓ os manifests antes do código: enquanto package*.json não mudar,
# o `npm ci` vem do cache, e o build fica em segundos em vez de minutos.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# ---------------------------------------------------------------------------
FROM deps AS build
COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------------------------------------------------------------------------
FROM build AS test
COPY test ./test
COPY migrations ./migrations
# Falhou o teste → falhou o build → a imagem nem chega a existir.
RUN npm run test:unit
# Usado pelo docker-compose.test.yml (com Postgres) para os testes de integração.
CMD ["npm", "test"]

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# A versão que está rodando, visível em /api/version (injetada no build).
ARG APP_VERSION=dev
ENV APP_VERSION=${APP_VERSION}

COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
COPY migrations ./migrations

# Nunca rode como root dentro do contêiner.
USER node
EXPOSE 3000

# O HEALTHCHECK é como o Docker (e o `compose up --wait`) sabe que a API
# está de pé. Usa o wget do Alpine: não precisa instalar nada.
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/ready || exit 1

# `node` direto (sem `npm start`): o processo recebe o SIGTERM do `docker stop`
# e consegue encerrar de forma limpa.
CMD ["node", "dist/index.js"]
