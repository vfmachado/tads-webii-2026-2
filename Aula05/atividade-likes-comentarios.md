   # Atividade guiada — Curtidas e comentários

## Contexto

O frontend já está pronto no projeto [`rede-social/`](rede-social/). O feed agora mostra, em
cada post, um coração clicável com a contagem de curtidas e um ícone de comentário com a
quantidade de comentários; clicar no conteúdo do post leva para a página do post.

Nada disso funciona ainda: **todo o backend é a atividade de vocês**. Enquanto as rotas não
existirem, as contagens aparecem como `0`, o coração fica vazio e clicar no post dá 404.

O objetivo não é seguir uma receita, e sim ir do "o que precisa existir" até o "como fazer".
Cada item abaixo é um passo de alto nível — a decisão de como implementar é de vocês.

## O contrato que o frontend já espera

As views não vão ser alteradas. Elas assumem que o backend entrega o seguinte:

**Rotas** (as três ainda não existem em `src/webRoutes.ts`):

| Método e caminho | Quem chama | O que deve acontecer |
| --- | --- | --- |
| `GET /posts/:id` | link no conteúdo do post e no ícone de comentários | renderizar a view `post` |
| `POST /posts/:id/like` | botão de coração (feed e página do post) | curtir/descurtir e voltar para de onde veio |
| `POST /posts/:id/comments` | formulário na página do post | criar o comentário e voltar para a página do post |

**Dados**, tanto no feed (`src/views/feed.ejs`) quanto na página do post (`src/views/post.ejs`):

| O que a view lê | Para quê |
| --- | --- |
| `post._count.likes` | número ao lado do coração |
| `post._count.comments` | número ao lado do ícone de comentário |
| `post.likedByMe` | pintar o coração de vermelho quando o usuário logado já curtiu |
| `post.comments` (cada um com `author`, `content`, `createdAt`) | lista de comentários na página do post |

A view `post` é renderizada com `currentUser` e `post` — do mesmo jeito que `feed` já recebe
`currentUser`, `feed` e `others` na rota `/`.

## Passos

### 1. Modelo de dados

1. Pense em que entidades novas o banco precisa e que relações elas têm com `User` e com `Post`.
2. Decida o que caracteriza a identidade de uma curtida (o que impede a mesma pessoa de curtir o
   mesmo post duas vezes?) e por que um comentário não tem essa mesma restrição.
3. Defina o comportamento quando um post ou um usuário é apagado — as curtidas e os comentários
   devem sobreviver a isso?
4. Gere e aplique a migration (`npm run prisma:migrate`) e confira o resultado no banco.

> Referência: os modelos `Follow` (junção explícita, chave composta) e `Post`/`Tag` já existentes
> em `prisma/schema.prisma` resolvem problemas parecidos.

### 2. Camada de domínio (controllers)

1. Escreva as operações novas: curtir/descurtir um post e comentar um post.
2. Decida onde cada uma mora — `PostController`? Um controller novo? — e justifique a escolha.
3. Curtir duas vezes não pode explodir nem duplicar: escolha entre tratar o erro de chave
   duplicada (como `UserController.follow` faz) ou verificar antes de gravar. Descurtir também
   é a mesma rota.
4. Valide o conteúdo do comentário e lance um erro do `src/shared/errors.ts` (ou crie um novo)
   quando ele for inválido, seguindo o padrão já usado por `PostController.create`.

### 3. Buscar um post com tudo que a página precisa

1. Estenda a busca de um post por id para trazer também os comentários (com o autor de cada um)
   e as contagens de curtidas e comentários.
2. Descubra como pedir ao Prisma a contagem de uma relação sem carregar todos os registros —
   `UserController.get` já faz isso com `_count` para posts/seguidores.
3. Defina a ordem dos comentários (mais novos primeiro? mais antigos primeiro?) e justifique.

### 4. Feed com as contagens

1. Faça o feed devolver, para cada post, as duas contagens que a view espera.
2. Resolva o `likedByMe`: é a informação "o usuário logado já curtiu este post?". Pense em como
   obter isso sem fazer uma consulta por post — `UserController.listOthers` resolve exatamente
   esse tipo de problema para o `isFollowing`.

### 5. Rotas web

1. Crie as três rotas da tabela de contrato em `src/webRoutes.ts`, seguindo o estilo das que já
   existem (`asyncHandler`, tratamento de `ValidationError`, `res.redirect` depois de escrever).
2. Lembre de proteger o que precisa de login com o middleware de autenticação.
3. Receba o texto do comentário do corpo da requisição (o formulário envia o campo `content`) e
   o id do post da URL.
4. **O id de quem curte e de quem comenta vem da sessão, nunca do corpo da requisição** — é a
   mesma regra que já vale para `authorId` na criação de post. Discuta o que um usuário
   mal-intencionado conseguiria fazer se esse id viesse do formulário.
5. Trate o caso do post inexistente devolvendo 404 com a view `error`.

### 6. Autorização (pense antes de codar)

1. Quem pode apagar um comentário? Vale a mesma regra do post (`requireOwnPost`) ou o dono do
   post também deveria poder? A view ainda não tem esse botão — se implementar, adicione.
2. Faz sentido exigir que a pessoa siga o autor para poder curtir ou comentar? Por que sim/não?

### 7. Testes

Escreva testes de integração para o que você criou, no estilo de `test/integration/posts.routes.test.ts`:
curtir, curtir de novo (não pode duplicar), descurtir, comentar, comentar sem estar logado.

## Como saber que terminou

* O feed mostra as contagens reais e o coração pintado nos posts que você já curtiu.
* Clicar no coração muda o número e a cor; clicar de novo desfaz.
* Clicar no conteúdo de um post abre a página dele com o post e os comentários.
* Comentar adiciona o comentário na lista e aumenta o número no feed.

## OUTROS EXERCÍCIOS

1. Fazer o coração funcionar sem recarregar a página (`fetch` + atualizar o número no DOM).
2. Expor curtidas e comentários também na API JSON de leitura (`src/routes.ts`).
3. Permitir responder a um comentário (comentário de comentário) — o que muda no modelo?
4. Ordenar o feed por "mais curtidos nas últimas 24h" em vez de por data.
