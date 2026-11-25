# syntax=docker/dockerfile:1.7
#
# Dois estágios: o Node compila o React; o nginx serve só os arquivos
# estáticos. A imagem final NÃO tem Node, npm nem código-fonte (~50 MB).

ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src
COPY test ./test
# Testes do front rodam no build: componente quebrado → imagem não é gerada.
RUN npm test
RUN npm run build

# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
