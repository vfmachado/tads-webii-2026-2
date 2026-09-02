# Aula 04 — Rede social mínima (Prisma)

Aula de camada de persistência com ORM. Uma API HTTP mínima de rede social, modelada com Prisma sobre SQLite, cobrindo as três formas de relação que a aula precisa demonstrar:

* **1:N** — `User → Post` (um autor tem muitos posts).
* **N:N implícita** — `Post ↔ Tag` (o Prisma cria e gerencia a tabela de junção sozinho).
* **Autorrelação N:N** — `User ↔ User` via `Follow` (seguidores/seguindo), com tabela de junção **explícita** porque há duas relações diferentes com `User` no mesmo model.

Ver o schema completo em [`prisma/schema.prisma`](prisma/schema.prisma).

## Rodando

### Rodando com Docker (recomendado)

Rodar em container resolve o problema de ambiente: todo mundo usa a mesma versão de Node e os módulos nativos (`better-sqlite3`, `bcrypt`) são compilados dentro da imagem, para Linux — não importa se a máquina é macOS, Windows ou Linux. Não é preciso ter Node nem `npm install` na máquina, só o Docker.

```bash
cp .env.example .env      # opcional: o compose já tem defaults para tudo
docker compose up         # constrói na primeira vez e sobe em http://localhost:3003
```

O container aplica as migrations sozinho ao subir ([`docker/entrypoint.sh`](docker/entrypoint.sh)). Para popular o banco com os dados de exemplo (3 usuários, senha `senha123`):

```bash
docker compose exec app npm run prisma:seed
```

**Refresh automático:** a pasta do projeto é montada dentro do container (bind mount), e o comando padrão é `tsx watch`. Salvar um arquivo `.ts` reinicia o servidor; salvar um `.ejs` já vale na próxima requisição — sem rebuild, sem `docker compose restart`.

Outros comandos úteis:

```bash
docker compose up --build                 # reconstrói a imagem (necessário só após mexer no package.json)
docker compose logs -f app                # acompanha os logs
docker compose exec app npm test          # roda a suíte dentro do container
docker compose exec app sh                # abre um shell no container
docker compose down                       # derruba
```

Se os logs estiverem verbosos demais, é o `DEBUG="prisma*"` do `.env` — comente essa linha e rode `docker compose restart app`.

#### O que cada arquivo faz

| Arquivo | Papel |
| --- | --- |
| [`Dockerfile`](Dockerfile) | Imagem de desenvolvimento em estágios: `base` (Node + openssl), `deps` (instala e compila `node_modules`), `dev` (a imagem que roda). |
| [`docker-compose.yml`](docker-compose.yml) | Orquestra o serviço `app`: variáveis de ambiente, porta 3003 e os volumes. |
| [`docker/entrypoint.sh`](docker/entrypoint.sh) | Roda `prisma migrate deploy` antes de iniciar o servidor. |
| [`.dockerignore`](.dockerignore) | Mantém `node_modules`, `dist`, `coverage` e os `.db` fora do contexto de build. |
| [`.env.example`](.env.example) | Documenta todas as variáveis que a aplicação lê. |

Dois detalhes do [`docker-compose.yml`](docker-compose.yml) que valem uma olhada em aula:

* **O volume anônimo `- /app/node_modules`.** O bind mount `.:/app` cobriria o `node_modules` compilado dentro da imagem com o da máquina host — que no macOS/Windows tem os binários nativos do SO errado. O volume anônimo por cima "protege" essa pasta.
* **O banco continua sendo o `dev.db` da pasta do projeto**, porque ele está dentro do bind mount. Ou seja: os dados sobrevivem ao `docker compose down` e o `npm run prisma:studio` na máquina host continua abrindo o mesmo banco que o container usa.

O upload de imagens segue a mesma lógica de sempre ([`src/uploads/createImageStorage.ts`](src/uploads/createImageStorage.ts)): sem `AWS_S3_BUCKET`/`AWS_REGION` no `.env`, os arquivos vão para `uploads/` — que também está no bind mount, então aparecem na pasta do projeto.

> Esta imagem é de **desenvolvimento** (roda TypeScript direto com `tsx`, inclui as devDependencies). Empacotar para produção — build com `tsc`, imagem só com `dist/` e dependências de runtime — é assunto de outra aula.

### Rodando direto na máquina (sem Docker)

```bash
npm install              # também roda `prisma generate` (postinstall)
npm run prisma:migrate    # cria dev.db e aplica a primeira migration
npm run prisma:seed       # popula com 3 usuários, 3 posts, 2 tags, 3 follows
npm run dev                 # sobe a API em http://localhost:3003
npm test                     # suíte de integração (usa um SQLite dedicado, test.db)
```

`npm run prisma:studio` abre o Prisma Studio (GUI) para inspecionar as tabelas — útil para mostrar em aula a tabela de junção implícita `_PostToTag`, que não existe no schema mas existe no banco.

### Testando manualmente com [`test.http`](test.http)

Com a extensão **REST Client** (Huachao Mao) instalada no VS Code, abra [`test.http`](test.http) e clique em "Send Request" acima de cada bloco. O arquivo cobre o fluxo completo (criar usuários, seguir, criar posts com tags, feed, busca por tag) e uma seção de casos de erro (400/404/409) — os requests estão encadeados via variáveis nomeadas (`{{createAna.response.body.$.id}}`), então rode de cima para baixo na primeira vez.

## Endpoints

| Método | Rota | O que demonstra |
| --- | --- | --- |
| `POST /users` | cria usuário (`{ name, email }`) | — |
| `GET /users/:id` | usuário + `_count` de posts/seguidores/seguindo | contagem via relação |
| `POST /users/:id/follow` | segue outro usuário (`{ targetId }`) | **autorrelação N:N** |
| `GET /users/:id/feed` | posts de quem o usuário segue | filtro relacional aninhado (`author.followers.some`) |
| `POST /posts` | cria post (`{ authorId, content, tags?: string[] }`) | **1:N** (`connect`) + **N:N** (`connectOrCreate`) na mesma escrita |
| `GET /posts/:id` | post com autor e tags | `include` |
| `GET /tags/:name/posts` | posts de uma tag | N:N do outro lado |

## Estrutura

```
prisma/
├── schema.prisma   → os 4 models e as 3 relações
└── seed.ts          → dados de exemplo

src/
├── db.ts                    fábrica de PrismaClient
├── users/UserController.ts   create, get, follow, feed
├── posts/PostController.ts   create, get, listByTag
├── shared/                   erros de domínio, error handler, asyncHandler
├── routes.ts, server.ts, index.ts

test/
├── globalSetup.ts            aplica as migrations no banco de teste antes da suíte
├── helpers/testDb.ts          PrismaClient de teste + reset de tabelas
└── integration/               rotas testadas ponta a ponta com Supertest + SQLite real
```

De propósito, os Controllers chamam o Prisma Client diretamente — **não há repositório nem porta de persistência ainda**. Essa separação (arquitetura em camadas/hexagonal, isolando o domínio do Prisma) é o tema da Aula 05, que reaproveita este mesmo Prisma Client como adaptador.

## Testes: por que usam SQLite real, não mocks

`test/globalSetup.ts` roda `prisma migrate deploy` contra um `test.db` isolado antes da suíte, e cada teste começa com `resetDatabase()` (limpa as tabelas na ordem certa: `Follow → Post → Tag → User`). Isso segue a mesma filosofia das Aulas 02/03: testar a colaboração real com o ORM, não uma simulação dele — um mock de Prisma não pegaria, por exemplo, uma violação de unicidade (`P2002`) real.

## Atividade em sala

1. Rodar `npm run prisma:studio` e abrir a tabela `_PostToTag` — perguntar: "isso está em algum lugar do `schema.prisma`?" (resposta: não, o Prisma cria sozinho).
2. Seguir o fluxo `POST /users` → `POST /users/:id/follow` → `GET /users/:id/feed` com dois usuários e comparar o feed antes/depois do follow.
3. Ler `UserController.follow` e discutir: por que validar `targetId === followerId` no código, em vez de deixar o banco rejeitar? E por que ainda assim existe um `try/catch` para `P2002`?
4. Alterar `Follow` para incluir um campo `createdAt` já existe — desafio: adicionar um endpoint `GET /users/:id/following` que lista quem o usuário segue (usar `user.following` com `include: { following: true }`).
