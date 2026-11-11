# Aula 12 — Tarefas: testes, empacotamento e deploy

Um sistema pequeno de propósito didático (lista de tarefas) com **três peças** que sobem juntas com um único comando:

```mermaid
flowchart LR
  B((Navegador)) -- ":8090" --> W["web<br/>nginx + build estático do React"]
  W -- "/api/* (proxy)" --> A["api<br/>Node + Express"]
  M["migrate<br/>(one-shot)"] -. "aplica SQL e sai" .-> D
  A --> D[("db<br/>PostgreSQL 17<br/>volume pgdata")]
  M -. "antes da api" .-> A
```

Material da aula: [`../aula12.md`](../aula12.md).

## Subir tudo

Pré-requisito: Docker com Compose. (Node só é necessário para rodar testes fora do Docker.)

```bash
cd Aula12/tarefas
cp .env.example .env                       # ajuste a senha
docker compose up -d --build --wait        # db → migrate → api → web, esperando ficar saudável
docker compose ps                          # db/api/web "healthy"; migrate "Exited (0)"
docker compose --profile smoke run --rm smoke   # valida o fluxo principal de ponta a ponta
```

Abra **http://localhost:8090**. Para derrubar: `docker compose down` (mantém os dados) ou `docker compose down -v` (apaga o volume).

## Testes

| Camada | O que prova | Como rodar | Precisa de |
| ------ | ----------- | ---------- | ---------- |
| Unitário (API) | regras de domínio, config, rotas com repositório em memória | `cd api && npm run test:unit` | só Node |
| Componente (web) | a tela, com `fetch` falso | `cd web && npm test` | só Node |
| Integração (API) | migrations e SQL num **Postgres real** | `docker compose -f docker-compose.test.yml up --build --abort-on-container-exit --exit-code-from api-test` | Docker |
| E2E / smoke | o sistema **publicado**: nginx → API → banco | `docker compose --profile smoke run --rm smoke` | sistema no ar |

Os testes unitários da API e os do front também rodam **durante o `docker build`** (estágios `test` e `build`): imagem com teste vermelho não é gerada.

```bash
docker compose -f docker-compose.test.yml down -v   # limpa o banco de teste
```

## Deploy, rollback e backup

```bash
scripts/deploy.sh            # build → backup → migrations+up → smoke → (rollback automático se falhar)
scripts/deploy.sh v1.2.0     # com uma tag escolhida (padrão: hash do commit)
scripts/rollback.sh          # volta para a versão anterior (segundos; sem recompilar)
scripts/backup.sh            # pg_dump validado, com rotação (KEEP=7)
scripts/restore.sh --verify backups/arquivo.dump   # prova que o backup restaura (banco temporário)
scripts/restore.sh backups/arquivo.dump            # restaura de verdade (pede confirmação)
```

A versão no ar aparece no rodapé da tela e em `GET /api/version`.

## Estrutura

```
tarefas/
├── docker-compose.yml        # produção-like: db, migrate, api, web (+ smoke sob profile)
├── docker-compose.test.yml   # Postgres descartável + suíte da API
├── docker-compose.dev.yml    # override: expõe db/api no localhost (só dev)
├── .env.example
├── api/                      # Express + pg. Dockerfile multi-stage (deps/build/test/runtime)
│   ├── migrations/           # 001, 002: SQL puro, versionado
│   └── src/                  # domain · application · adapters (http, postgres, memory) · migrate.ts
├── web/                      # React + Vite. Dockerfile: build → nginx
│   └── nginx.conf            # estáticos com cache + proxy /api + SPA fallback
├── e2e/smoke.test.mjs        # pós-deploy, zero dependências
├── scripts/                  # deploy, rollback, backup, restore
└── ci/github-actions.yml     # pipeline (copiar para .github/workflows/)
```

## Variáveis de ambiente

| Variável | Onde | Para quê |
| -------- | ---- | -------- |
| `POSTGRES_USER/PASSWORD/DB` | `.env` | credenciais do banco; a `DATABASE_URL` da API é montada pelo compose |
| `WEB_PORT` | `.env` | porta publicada (padrão 8090) |
| `TAG` | deploy | tag das imagens; vira `APP_VERSION` dentro da API |
| `DATABASE_URL`, `PORT`, `NODE_ENV`, `APP_VERSION` | API | validadas por Zod na partida ([`config.ts`](api/src/config.ts)) |

O frontend **não tem variável nenhuma**: chama `/api` (caminho relativo) e o nginx decide o destino. O mesmo build serve em qualquer ambiente.

## Desenvolvimento sem rebuild a cada mudança

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db
cd api && DATABASE_URL=postgres://tarefas:troque-esta-senha@localhost:5432/tarefas npm run migrate
DATABASE_URL=postgres://tarefas:troque-esta-senha@localhost:5432/tarefas npm run dev   # :3000
cd ../web && npm run dev                                                                # :5173
```

## Medições (nesta máquina)

Imagem da API: ~181 MB · imagem do web (nginx): ~60 MB · testes da API (unit + integração): ~2 s.
