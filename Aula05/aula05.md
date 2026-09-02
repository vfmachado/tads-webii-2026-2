# Aula 05 — Autenticação, autorização e upload de arquivos

## Objetivo

Entender a diferença entre autenticação ("quem é você?") e autorização ("você pode fazer isso?"), implementar login baseado em sessão com hash de senha, e lidar com upload de arquivos por trás de uma abstração que permite trocar a implementação de armazenamento sem tocar no resto da aplicação. Ao final da aula, o estudante deve saber explicar como uma sessão de cookie funciona de ponta a ponta e por que autenticação e autorização são checagens separadas, feitas em momentos diferentes.

## Conteúdos

* **Autenticação x autorização** — perguntas diferentes: autenticação só confirma que existe alguém logado; autorização decide se essa pessoa pode agir sobre um recurso específico. Um usuário autenticado ainda pode ser barrado por autorização (ex.: apagar post de outra pessoa).
* **Sessão baseada em cookie** (`express-session`): o cookie carrega só o id da sessão, nunca o dado sensível; os dados reais (`req.session.userId`) ficam num store no servidor (aqui, `MemoryStore`, só para dev/aula). Diferença para JWT: revogar uma sessão é só apagar a entrada no store, sem precisar de blocklist.
* **Hash de senha com bcrypt**: o salt vem embutido no próprio hash de saída (não é gerenciado à parte); custo (`SALT_ROUNDS`) equilibra dificultar força bruta x não travar a requisição; nunca comparar senha e hash com `===` — é preciso recalcular o hash com o mesmo salt (`bcrypt.compare`).
* **Prevenção de user enumeration**: `login` devolve a mesma mensagem de erro tanto para e-mail inexistente quanto para senha errada, para não revelar quais contas existem no sistema.
* **Middleware de autenticação x autorização em cadeia**: `requireAuth` (autenticação) roda antes de `requireOwnPost` (autorização) — a ordem importa, porque a segunda pergunta ("é dono do post?") só faz sentido depois que já se sabe quem está logado.
* **Upload de arquivos com Multer**: `memoryStorage` entrega o arquivo em `Buffer` (RAM) em vez de gravar em disco sozinho; `fileFilter` valida o mimetype antes de aceitar; limite de tamanho evita uploads grandes demais. Trade-off: simples para uma aula, mas streaming seria o ideal em produção com arquivos grandes.
* **Abstração de armazenamento (`ImageStorage`)**: uma interface pequena com duas implementações intercambiáveis — `LocalImageStorage` (grava em disco, servido por `express.static`) e `S3ImageStorage` (`PutObjectCommand` real). `createImageStorage()` escolhe uma das duas em runtime, conforme variáveis de ambiente (`AWS_S3_BUCKET`/`AWS_REGION`) — o resto da aplicação (`PostController`, rotas, views) não sabe qual está em uso, só chama `upload()`. É uma pequena inversão de dependência local, não o Ports & Adapters completo da arquitetura hexagonal (isso fica para uma aula futura, quando a ideia é generalizada para todo o domínio).
* **Duas superfícies de rotas**: `routes.ts` continua sendo a API JSON somente leitura da Aula 04; `webRoutes.ts` é nova — rotas que servem HTML (EJS) e dependem de sessão (registro, login, feed, criar/apagar post, seguir).
* **`authorId`/`followerId` vindos da sessão, nunca do corpo da requisição** — é a autorização "você só pode agir como você mesmo" expressa em código.

## Material desta pasta

Continuação do projeto [`rede-social/`](rede-social/) da Aula 04, agora com frontend server-rendered (EJS), autenticação e upload de imagem.

```bash
cd rede-social
npm install              # roda `prisma generate` no postinstall
npm run prisma:migrate    # aplica as migrations (inclui passwordHash, avatarUrl)
npm run prisma:seed       # popula usuários, posts, tags e follows de exemplo
npm run dev                 # sobe a aplicação em http://localhost:3003
npm test                     # suíte de integração
```

Sem `AWS_S3_BUCKET`/`AWS_REGION` configurados no `.env`, o upload cai automaticamente em `LocalImageStorage` (arquivos gravados em `rede-social/uploads/`) — quem quiser testar a integração real com S3 configura essas variáveis, sem mudar uma linha de código da aplicação.

## Atividade em sala

1. Acessar `/register`, criar dois usuários (um com avatar, um sem) e conferir o arquivo salvo em `uploads/` (ou no bucket S3, se configurado).
2. Tentar acessar `/` sem estar logado — observar o redirecionamento para `/login` feito por `requireAuth`.
3. Logar como um usuário, criar um post; logar como um segundo usuário e tentar `POST /posts/:id/delete` no post do primeiro — observar o 403 vindo de `requireOwnPost`.
4. Ler `AuthController.login` (`src/auth/AuthController.ts`) e discutir por que a mensagem de erro é idêntica para "e-mail não existe" e "senha errada".
5. Desafio (estica): trocar a store da sessão de `MemoryStore` para outra (ex.: baseada em arquivo) e identificar o que muda — e o que não muda — no resto do código.

## Atividade guiada (para casa)

[Curtidas e comentários](atividade-likes-comentarios.md) — o frontend (coração com contagem,
ícone de comentários e página do post) já vem pronto no projeto; a atividade é implementar o
backend: modelo de dados, controllers e as rotas que as views esperam.
