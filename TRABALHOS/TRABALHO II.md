# Trabalho II

## DATA 30/09/2026

## Contexto

Este trabalho dá continuidade ao projeto [`rede-social/`](../Aula05/rede-social/), construído nas Aulas [04](../Aula04/aula04.md) (modelagem com Prisma) e [05](../Aula05/aula05.md) (autenticação, autorização e upload de imagem). Hoje o projeto tem: `User` (1:N com `Post`), `Post` (N:N com `Tag`), `Follow` (autorrelação N:N entre `User`), login por sessão (`express-session` + `bcryptjs`), autorização vinda da sessão (nunca do corpo da requisição) e upload de uma imagem por post atrás da abstração `ImageStorage`. O feed (`src/views/feed.ejs`) é inteiramente server-rendered: cada ação (postar, seguir, apagar) é um `<form>` que recarrega a página.

O objetivo deste trabalho é evoluir essa rede social para o próximo nível de completude — curtidas, comentários, curtidas em comentários, posts com múltiplas fotos em carrossel e um feed que carrega mais conteúdo via `fetch` em vez de recarregar a página — usando **somente** os conceitos já vistos até a Aula 05 (modularidade por *feature*, modelagem de relações no Prisma, camada de persistência, autenticação/autorização baseada em sessão, abstração de upload). Arquitetura hexagonal e Ports and Adapters (que o `README.md` da Aula 04 previa para a Aula 05, mas foi adiada) **não** são exigidas aqui — o Controller continua chamando o Prisma Client diretamente, como hoje.

## Objetivo

Projetar e implementar, como módulos novos e coesos (no espírito da Aula 03: alta coesão, baixo acoplamento, *package by feature*), as funcionalidades que tornam a rede social comparável a um produto real: interação em posts e comentários, mídia múltipla por post e carregamento incremental de conteúdo. Ao final, o aluno deve saber justificar cada nova tabela do schema, cada nova rota e por que a UI passou a usar `fetch` em vez de apenas formulários HTML tradicionais.

## Conteúdos trabalhados

* Modelagem de relações no Prisma: N:N explícita com atributos (`Like`, análogo ao `Follow` da Aula 04) e 1:N novo (`Comment`, `PostImage`).
* Migrations incrementais sobre um schema já em produção (evoluir `Post.imageUrl` para uma relação `Post → PostImage[]` sem perder dados existentes).
* Autorização vinda da sessão: só quem está logado curte, comenta ou apaga o próprio comentário — mesma regra de `authorId`/`followerId` já aplicada a posts e follows.
* Modularidade por *feature*: `likes/`, `comments/` como módulos novos, decidindo explicitamente o que cada um expõe para `posts/` (e o que não expõe).
* Upload de múltiplos arquivos com Multer (`upload.array`) reaproveitando a mesma abstração `ImageStorage` (`LocalImageStorage`/`S3ImageStorage`) — o storage não muda, só quantos arquivos chegam por vez.
* Consumo de rotas via `fetch` no cliente (JavaScript puro, sem framework — React só entra na Aula 10): atualização de UI sem recarregar a página, paginação incremental (scroll infinito).

## Preparando o ambiente

```bash
cd Aula05/rede-social
npm install
npm run prisma:migrate    # aplica as migrations existentes
npm run prisma:seed       # popula usuários, posts, tags e follows de exemplo
npm run dev                  # http://localhost:3003
npm test                      # suíte de integração existente deve continuar passando
```

Trabalhem em cópia (ou branch) do projeto — a suíte de testes da Aula 05 (`test/integration/*.test.ts`) deve continuar passando integralmente depois das mudanças, mesmo que `Post.imageUrl` mude de formato (ver Discussão obrigatória, item 2).

## Discussão obrigatória (antes de codar)

1. Hoje `PostController` (`src/posts/PostController.ts`) chama o Prisma Client diretamente — sem repositório, sem porta. Curtidas e comentários vão precisar consultar e escrever dados de `Post`. Vocês vão criar `LikeController`/`CommentController` como módulos independentes que recebem o `PrismaClient` por injeção (igual a `PostController`), ou vão colocar os métodos dentro do próprio `PostController`? Registrem o motivo da escolha.
2. `Post.imageUrl` é hoje uma coluna `String?` em `Post`. Para suportar múltiplas fotos, ela precisa virar uma relação `Post → PostImage[]`. Isso é uma **mudança de schema com dados existentes** (os posts do seed já têm `imageUrl` preenchido). Como você vai migrar esse dado sem perdê-lo — migration com passo de dados (*data migration*) ou aceitar recomeçar o banco de desenvolvimento (`prisma migrate reset`)? Qual das duas seria aceitável em produção, e por quê?
3. Curtir um post hoje exigiria recarregar a página inteira (como "Seguir" faz). Por que trocar isso por `fetch` melhora a experiência — e o que precisa ser tratado no cliente que um `<form>` tradicional trata de graça (estado de carregando, erro de rede, duplo clique)?
4. O feed com scroll infinito vai carregar posts novos dinamicamente, inseridos no DOM depois do carregamento da página. Os botões de curtir/comentar desses posts recém-inseridos não existem no momento em que a página carregou — um `addEventListener` posto em cada botão no `DOMContentLoaded` não vai alcançá-los. Como resolver isso (pesquisem *delegação de eventos*)?

## Atividades obrigatórias

Implementar, na ordem 1 → 6 (elas dependem umas das outras):

1. **Curtidas em posts** — model `Like` (`userId`, `postId`, `createdAt`, `@@id([userId, postId])`, análogo ao `Follow` da Aula 04) · `POST /posts/:id/like` e `DELETE /posts/:id/like` (ou um único endpoint que alterna) · autenticado via `requireAuth` · botão no feed que chama `fetch`, sem recarregar a página, mostrando a contagem atualizada.
2. **Comentários em posts** — model `Comment` (`id`, `content`, `createdAt`, `authorId`, `postId`) · `POST /posts/:id/comments` (cria, autenticado) e `GET /posts/:id/comments` (lista) · formulário de comentário no feed enviado via `fetch`, inserindo o comentário novo na tela sem reload · botão de apagar o próprio comentário (`requireOwnComment`, análogo a `requireOwnPost`).
3. **Curtidas em comentários** — model `CommentLike` (`userId`, `commentId`, `createdAt`, `@@id([userId, commentId])`) · mesma mecânica de alternância via `fetch` que a curtida de post, aplicada a cada comentário listado.
4. **Postagem com múltiplas fotos** — migrar `Post.imageUrl` para `PostImage` (`id`, `url`, `order`, `postId`) com relação 1:N · `upload.array('images', N)` no lugar de `upload.single('image')` em `POST /posts` · cada arquivo passa pela mesma `ImageStorage` já existente (um `imageStorage.upload()` por arquivo).
5. **Carrossel de fotos no post** — no feed, quando `post.images.length > 1`, exibir um carrossel (setas anterior/próxima ou indicadores) implementado em JavaScript puro; com 0 ou 1 foto, comportamento igual ao atual.
6. **Scroll infinito no feed via `fetch`** — endpoint paginado (por cursor ou por página, ex.: `GET /api/feed?cursor=<id>&limit=10`) devolvendo os próximos posts · no cliente, um listener de scroll (ou `IntersectionObserver`) que detecta a proximidade do fim da lista e busca a próxima página, inserindo os posts no DOM sem recarregar — respeitando a decisão da Discussão obrigatória (item 4) sobre delegação de eventos para os botões de curtir/comentar dos posts recém-carregados.
7. Edição de comentário próprio (com o mesmo tipo de checagem de autorização de `requireOwnComment`).
8. Atualização otimista no cliente: o botão de curtir muda de estado imediatamente ao clique, antes da resposta do servidor chegar, com rollback visual se o `fetch` falhar.
9. Ordenar comentários por mais curtidos (em vez de só por data).
10. Reordenar as fotos de um carrossel já postado (arrastar para mudar o campo `order` de `PostImage`).
11. Expor a paginação por cursor também na API JSON somente-leitura da Aula 04 (`src/routes.ts`), sem duplicar a lógica do endpoint usado pelo scroll infinito.
12. "Notificação" simples e não realtime: contador de "novas curtidas/comentários desde seu último acesso", calculado a partir de `createdAt`.

## Critérios de avaliação

* **Testes passam:** `npm test` sem falhas — incluindo a suíte existente da Aula 05, que não pode regredir.
* **Cobertura mantida:** cada funcionalidade nova (curtida, comentário, curtida em comentário, upload múltiplo, paginação) deve vir com teste de integração cobrindo o caminho feliz e pelo menos um caminho de erro (ex.: curtir sem estar logado, apagar comentário de outra pessoa).
* **Autorização correta:** `userId`/`authorId` de curtidas e comentários sempre vêm da sessão, nunca do corpo da requisição — mesma regra já aplicada a posts e follows.
* **Fronteira de módulo respeitada:** `likes/` e `comments/` não devem depender de detalhes internos de `posts/` além do que for exposto deliberadamente (ex.: o Prisma Client compartilhado é aceitável; acessar campos privados de outro Controller, não).
* **Migração sem perda de dados:** os posts do seed que já tinham `imageUrl` devem continuar com sua foto após a migração para `PostImage`.
* **UI funcional sem reload:** curtir, comentar e carregar mais posts não devem recarregar a página — verificável abrindo o DevTools e observando que só requisições `fetch` (`XHR`/`fetch`) disparam, não navegação de página.
* **Registro de decisões:** respostas da discussão obrigatória documentadas em comentário no código ou em parágrafo curto no README do projeto.

## Entrega

Repositório (ou cópia do projeto `rede-social/`) contendo a implementação das atividades obrigatórias, migrations do Prisma atualizadas, suíte de testes cobrindo os módulos novos sem regressão dos testes existentes, e o registro das decisões solicitadas.

Gravação da explicação (15 minutos) do projeto, cobrindo:
- O que mudou no schema do Prisma e por quê.
- Como cada nova funcionalidade foi implementada (curtida, comentário, curtida em comentário, upload múltiplo, scroll infinito).
- Como a autorização foi aplicada a cada nova funcionalidade.
- Como a UI foi atualizada sem recarregar a página.
- Decisões técnicas.