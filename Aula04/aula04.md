# Aula 04 — Camada de persistência com ORM (Prisma)

## Objetivo

Introduzir a camada de persistência usando um ORM, entendendo o que ele resolve (impedance mismatch, produtividade) e o que custa (abstração vazada, performance), e modelar na prática as três formas de relação que aparecem em praticamente qualquer domínio real: um-para-muitos, muitos-para-muitos e autorrelação. Ao final da aula, o estudante deve saber ler um `schema.prisma`, explicar por que uma relação precisa de tabela de junção implícita ou explícita, e escrever queries com `include`/`connect`/`connectOrCreate` sem recorrer a SQL manual.

**Nota de reordenação:** esta aula ocupava a posição da Aula 07 no planejamento original ("Persistência, transações e consistência"). Ela foi antecipada para a Aula 04 para que a turma já tenha uma camada de persistência real funcionando antes das Aulas 05 (arquitetura em camadas) e 06 (DDD) — ver [`../aulas.md`](../aulas.md).

## Conteúdos

* O que um ORM resolve (impedance mismatch, produtividade) e seus custos (queries N+1, abstração vazada, performance) — discussão aberta, sem vender o Prisma como bala de prata.
* Prisma: schema declarativo, migrations versionadas, Prisma Client. SQLite (desenvolvimento local) → PostgreSQL (produção) → Supabase (banco gerenciado + auth/storage) como trajetória de evolução do banco.
* Modelagem de relações:
  * **1:N** — `User → Post` (um autor tem muitos posts).
  * **N:N implícita** — `Post ↔ Tag` (o Prisma cria a tabela de junção sozinho).
  * **Autorrelação N:N** — `User ↔ User` via `Follow` (por que essa, ao contrário da de Post/Tag, precisa ser modelada como tabela de junção **explícita**).
* Transações, isolamento e concorrência otimista x pessimista sob a ótica do ORM.
* Nota de arquitetura (Prisma 7): `datasource.url` não vive mais em `schema.prisma` — mora em `prisma.config.ts`, e o `PrismaClient` passa a exigir um *driver adapter* (`@prisma/adapter-better-sqlite3`, aqui). Vale comentar em aula: isso é sintoma exatamente do que a Aula 05 vai nomear — mesmo o próprio ORM está separando "o quê" (schema/modelo) de "como conectar" (adapter).

## Material desta pasta

Um projeto completo e funcional (não é um template com TODOs, como o da Aula 03): [`rede-social/`](rede-social/), uma API HTTP mínima de rede social.

```bash
cd rede-social
npm install              # roda `prisma generate` no postinstall
npm run prisma:migrate    # cria dev.db e aplica a migration inicial
npm run prisma:seed       # popula com usuários, posts, tags e follows de exemplo
npm run dev                 # sobe a API em http://localhost:3003
npm test                     # suíte de integração (SQLite real, não mock)
```

Detalhes de endpoints, estrutura e decisões de teste em [`rede-social/README.md`](rede-social/README.md).

## Atividade em sala

1. Abrir [`rede-social/prisma/schema.prisma`](rede-social/prisma/schema.prisma) e, antes de rodar qualquer coisa, pedir para a turma apontar: qual campo é a 1:N? Qual é a N:N implícita? Por que `Follow` existe como model próprio em vez de só um campo em `User`?
2. Rodar `npm run prisma:studio` e abrir a tabela `_PostToTag` — ela não existe em lugar nenhum do schema. De onde ela veio?
3. Seguir o fluxo `POST /users` → `POST /users/:id/follow` → `GET /users/:id/feed` com dois usuários criados na hora e comparar o feed antes/depois do follow.
4. Ler `UserController.follow` (`rede-social/src/users/UserController.ts`) e discutir: por que o código valida `targetId === followerId` explicitamente, se a autorrelação já impede fisicamente duas linhas idênticas na chave composta `[followerId, followingId]`? E por que ainda existe um `try/catch` para o erro `P2002` do Prisma?
5. Desafio (estica): implementar `GET /users/:id/following`, retornando a lista de quem o usuário segue, usando `prisma.user.findUnique({ where: { id }, include: { following: { include: { following: true } } } })`.

## Discussão para a Aula 05

Guardem a pergunta: os `Controller`s desta aula chamam o Prisma Client **diretamente** — não existe repositório, nem porta de persistência. Isso é uma escolha proposital para manter o foco no ORM. A Aula 05 (arquitetura em camadas, hexagonal, Clean Architecture, Ports and Adapters) vai questionar exatamente essa decisão: o que muda se colocarmos uma porta de persistência entre o Controller e o Prisma Client? O que se ganha, e o que isso custa num projeto deste tamanho?
