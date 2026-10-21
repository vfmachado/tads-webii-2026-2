# Ideias para continuar explorando arquitetura hexagonal

Banco de ideias para próximas aulas, exercícios e trabalhos, a partir do que já foi visto:

| Aula | Projeto | O que já ficou estabelecido |
| ---- | ------- | --------------------------- |
| [06](../Aula06/aula06.md) | [`project-management`](../Aula06/project-management/) | Domínio, portas, adaptadores, composition root, módulos "by component", domínio rico × anêmico. CQRS e eventos citados como "para ir além". |
| [07](../Aula07/aula07.md) | [`notificacoes`](../Aula07/notificacoes/) | Refatorar um *single file* para Ports and Adapters. SMS com falha aleatória, limite de 5 envios por minuto, reenvio, Prisma. |
| [08](../Aula08/aula08.md) | [`cadastro`](../Aula08/cadastro/) | Estratégias de e-mail trocadas pelo `.env`, porta `CodeGenerator` para testar sem aleatoriedade, use case importando use case. |
| [09](../Aula09/aula09.md) | [`cadastro` + Zod + CQRS](../Aula09/cadastro/) | Validação de formato no adaptador × regra de negócio no domínio, contrato definido pelo núcleo, `.env` validado, [CQRS simples](../Aula09/cqrs.md) com portas de escrita e de leitura. |
| [WebSocket](../AulaWebSocket/aulaWebSocket.md) | [`chat`](../AulaWebSocket/chat/) | Conexões de longa duração e servidor que "empurra" mensagens. |

Cada ideia traz o **conceito** que ela ensina, **onde encaixa** nos projetos que os alunos já conhecem, uma **atividade** e uma **pergunta** para discussão. No fim há uma sugestão de trilha e um mini-projeto que junta várias delas.

---

## 1. O tempo como dependência: porta `Clock`

**Conceito:** dependências implícitas. `new Date()` e `Date.now()` são acesso ao mundo externo tanto quanto `Math.random()`, que a Aula 08 já resolveu com `CodeGenerator`.

**Onde encaixa:**
- Aula 08/09: o código de verificação passa a expirar em 10 minutos.
- Aula 07: o limite de "5 notificações por contato por minuto" é impossível de testar sem esperar um minuto.

**Atividade:** criar a porta `Clock { now(): Date }`, o adaptador `SystemClock` e um `FixedClock` para testes. A regra de expiração vai para a entidade: `user.verify(code, now)`.

**Pergunta:** o domínio deve receber o `Clock` (a porta) ou só a data (`now: Date`)? Qual das duas mantém a entidade mais pura?

---

## 2. Value Objects: acabando com a "obsessão por primitivos"

**Conceito:** um conceito do negócio com regra própria merece um tipo próprio. `Email`, `VerificationCode`, `Phone` (o E.164 da Aula 07) e `Channel` deixam de ser `string`.

**Onde encaixa:** é a continuação natural da Aula 09. Hoje o formato de e-mail é validado no Zod **e** no `User.create()`. Com um `Email.create(valor)`, a regra do domínio fica num lugar só e a entidade passa a receber um `Email` já válido.

```ts
export class Email {
  private constructor(readonly value: string) {}
  static create(raw: string): Email {
    const value = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new InvalidEmailError(raw);
    return new Email(value);
  }
  equals(other: Email): boolean { return this.value === other.value; }
}
```

**Atividade:** refatorar o `cadastro` para usar `Email` e `VerificationCode`. Contar quantos `toLowerCase()` espalhados desaparecem.

**Pergunta:** se `Email` já valida o formato, o schema Zod ainda precisa de `z.email()`? (Retoma a discussão "formato × negócio" da Aula 09.)

---

## 3. Decorators sobre portas: retry, fallback, log e cache sem tocar no núcleo

**Conceito:** padrão **Decorator**. Um adaptador que implementa a porta **e** recebe outra implementação da mesma porta, acrescentando comportamento. É o irmão do Strategy que apareceu na Aula 08.

**Onde encaixa:**
- Aula 07: o SMS falha aleatoriamente (`SMS_FAILURE_RATE`), um cenário perfeito para `RetryingSender`.
- Aula 08: `FallbackEmailSender(nodemailer, console)`. Se o SMTP cair, o código aparece no console.
- `LoggingUserRepository`, `CachingUserRepository`...

```ts
export class RetryingEmailSender implements EmailSender {
  constructor(private readonly inner: EmailSender, private readonly attempts = 3) {}
  async sendVerificationCode(to: { name: string; email: string }, code: string) {
    for (let i = 1; ; i++) {
      try { return await this.inner.sendVerificationCode(to, code); }
      catch (err) { if (i >= this.attempts) throw err; }
    }
  }
}

// composition root:
const emailSender = new RetryingEmailSender(new NodemailerEmailSender(smtp), 3);
```

**Atividade:** implementar retry e fallback e montar as combinações **só na composition root**. Mostrar o `git diff`: domínio e casos de uso intocados.

**Pergunta:** retry é regra de negócio ou detalhe técnico? E se o negócio disser "SMS tenta 3 vezes, e-mail tenta 1"?

---

## 4. Mais de um adaptador primário: CLI, job agendado e WebSocket

**Conceito:** o caso de uso não sabe quem o chamou. Se só existe HTTP, essa afirmação nunca é testada de verdade.

**Ideias de adaptadores primários:**
- **CLI:** `npm run cli -- register --name Ana --email ana@ifrs.edu.br` (a Etapa 9 do Trabalho III já pede).
- **Job agendado (cron):** a cada minuto, reenviar as notificações com status `failed` (Aula 07), chamando o mesmo `RetryNotification`.
- **WebSocket (ponte com a [AulaWebSocket](../AulaWebSocket/aulaWebSocket.md)):** o painel de administração recebe em tempo real "usuário X verificou a conta". Aqui o WebSocket é um adaptador **secundário** (porta `RealtimeNotifier`). Uma boa surpresa para a turma: a mesma tecnologia pode ser primária num projeto e secundária em outro.

**Atividade:** cada grupo escolhe um adaptador primário novo para o `cadastro`, sem alterar `application/` nem `domain/`.

**Pergunta:** o adaptador CLI precisa de Zod? O que muda na validação quando a entrada vem de `process.argv` em vez de `req.body`?

---

## 5. Eventos de domínio: desacoplando "o que aconteceu" de "quem reage"

**Conceito:** em vez de o caso de uso chamar tudo o que precisa acontecer depois, a entidade registra um fato (`UserVerified`, `ProjectCreated`) e quem quiser se inscreve. O [`arquitetura-hexagonal.md`](../Aula06/arquitetura-hexagonal.md#para-ir-além-cqrs-e-desacoplamento-entre-módulos) já deixou essa pergunta em aberto: como o `reports` fica sabendo de um projeto novo sem importar `projects`?

**Onde encaixa:**
- `cadastro`: quando o usuário é verificado, enviar um e-mail de boas-vindas **e** notificar o admin. O `VerifyUser` não deveria crescer a cada novo requisito.
- `project-management`: `reports` reagindo a `ProjectCreated`.
- [`DISCUSSAO.md`](../Aula08/DISCUSSAO.md) da Aula 08: "use case importando outro use case" e "cadastrar cliente + endereço". Eventos são uma terceira resposta para essa discussão.

**Atividade:** porta `EventPublisher` e um adaptador `InMemoryEventBus` (um `EventEmitter`). Os *handlers* ficam na camada de aplicação e são registrados na composition root.

**Pergunta:** se o handler de boas-vindas falhar, a verificação deve ser desfeita? (Prepara as ideias 6 e 7.)

---

## 6. Persistência real e transações: onde mora o "tudo ou nada"?

**Conceito:** a transação é um detalhe técnico, mas **o que precisa ser atômico** é decisão de negócio. Padrão **Unit of Work**.

**Onde encaixa:**
- Aula 08, exercício 4: `PrismaUserRepository` no `cadastro`.
- Um caso de uso que grava em dois repositórios (ex.: `User` + `AuditLog`, ou cliente + endereço da `DISCUSSAO.md`).

**Atividade:** criar uma porta `UnitOfWork { run<T>(fn: (repos) => Promise<T>): Promise<T> }` com uma implementação via `prisma.$transaction` e outra em memória.

**Pergunta:** por que `prisma.$transaction` não pode aparecer dentro do caso de uso? O que a porta precisa expor para que o caso de uso continue sem saber que existe Prisma?

---

## 7. Outbox e mensageria: o "e-mail antes de salvar" levado a sério

**Conceito:** a Aula 08 escolheu "enviar antes de salvar" para não persistir usuário sem e-mail. Mas e se o e-mail sair e o `save` falhar? Não existe transação entre banco e SMTP. O padrão **Transactional Outbox** resolve: salvar o usuário **e** um registro "e-mail pendente" na mesma transação; um processo separado envia.

**Onde encaixa:** junta as ideias 3, 5 e 6 e abre caminho para a aula de mensageria / arquitetura orientada a eventos.

**Atividade:**
1. Tabela `outbox` no Prisma e um `OutboxEventPublisher` (adaptador secundário).
2. Um *worker* (adaptador **primário**!) que lê a outbox e chama o `EmailSender`.
3. Versão 2: trocar a tabela por uma fila (BullMQ/Redis ou RabbitMQ) **mudando só adaptadores**.

**Pergunta:** com o outbox, o cliente HTTP recebe 201 antes de o e-mail sair. Isso muda a experiência do usuário? Como avisar se o envio falhar depois?

---

## 8. Anti-corruption layer: integrando uma API externa

**Conceito:** uma API de terceiros tem o **modelo dela**. O adaptador traduz esse modelo para o nosso, para que nomes e formatos alheios não vazem para o domínio.

**Onde encaixa:** cadastro de endereço por CEP com a [ViaCEP](https://viacep.com.br) (`logradouro`, `localidade`, `uf`, `erro: true`...). Porta `AddressLookup { findByZipCode(cep: ZipCode): Promise<Address | null> }`.

**Atividade:** implementar `ViaCepAddressLookup` validando a **resposta** da API com Zod (a Aula 09 validou só a entrada; resposta de terceiro também é dado não confiável) e um `FakeAddressLookup` para testes. Depois, um `CachingAddressLookup` (ideia 3).

**Pergunta:** se a ViaCEP sair do ar, o cadastro deve falhar ou aceitar o endereço sem confirmação? Quem decide, o adaptador ou o caso de uso?

---

## 9. Autenticação e autorização: o que é borda e o que é regra

**Conceito:** ler o header `Authorization` e validar a assinatura do JWT é adaptador; "só o dono do projeto pode avançar a etapa" é domínio. O [`RequireModuleAccess`](../Aula06/project-management/src/shared/http/RequireModuleAccess.ts) da Aula 06 já mostra um pedaço disso.

**Onde encaixa:** continuação do exercício 5 da Aula 08 (senha com `PasswordHasher`).

**Atividade:** caso de uso `Login` com as portas `PasswordHasher` (scrypt/bcrypt) e `TokenIssuer` (JWT), mais um middleware que transforma o token num `Actor { id, roles }` passado ao caso de uso.

**Pergunta:** o caso de uso deve receber o `req.user` do Express, um `Actor` próprio ou nada (e a autorização fica toda no middleware)? O que acontece com a regra quando entra um adaptador CLI?

---

## 10. CQRS leve: leituras que não passam pelo domínio

> **Já implementado na Aula 09**: veja [`Aula09/cqrs.md`](../Aula09/cqrs.md) e o projeto [`Aula09/cadastro`](../Aula09/cadastro/). O que segue serve para levar a ideia aos outros projetos ou para os níveis seguintes (modelo de leitura próprio, alimentado por eventos).

**Conceito:** escritas precisam das invariantes do domínio; leituras muitas vezes não. Um *query service* pode ir direto ao banco e devolver o DTO pronto.

**Onde encaixa:**
- Na Aula 08, `ListUsers` carregava entidades inteiras só para mapear `{ name, email, verified }`.
- `GET /notifications` com filtros, paginação e ordenação (Aula 07); `GetProjectsSummary` (Aula 06).

**Atividade:** separar `application/commands/` de `application/queries/`; criar a porta `UserQueries` com `list({ verified?, page, pageSize })` implementada com um `select` do Prisma. Validar a query string com Zod (`z.coerce.number()`, `z.stringbool()`).

**Pergunta:** a porta `UserQueries` ainda está "na linguagem do negócio" ou já virou um disfarce para SQL? (Retoma o erro comum nº 2 do material da Aula 06.)

---

## 11. Testes que protegem a arquitetura

**Conceito:** o checklist de PR da Aula 06 pode virar teste automatizado.

**Ideias:**
- **Testes de arquitetura:** [`dependency-cruiser`](https://github.com/sverweij/dependency-cruiser) ou `eslint-plugin-boundaries` falhando o build se `domain/` importar `express`, `zod`, `@prisma/client` ou `adapters/`.
- **Testes de contrato de porta:** a **mesma** suíte roda contra `InMemoryUserRepository` e `PrismaUserRepository`. Se o fake se comporta diferente do real, os testes de caso de uso estão mentindo.

```ts
export function userRepositoryContract(name: string, make: () => Promise<UserRepository>) {
  describe(`UserRepository: ${name}`, () => {
    test('findByEmail devolve undefined quando não existe', async () => { /* ... */ });
    test('save sobrescreve o usuário com o mesmo e-mail', async () => { /* ... */ });
  });
}
userRepositoryContract('memória', async () => new InMemoryUserRepository());
userRepositoryContract('prisma', async () => new PrismaUserRepository(await testPrisma()));
```

**Atividade:** introduzir uma violação de propósito (`import express` no `User.ts`) e ver o CI falhar.

**Pergunta:** quais regras do checklist da Aula 06 **não** dá para automatizar? (Ex.: "a porta fala a língua do negócio?")

---

## 12. Erros como valores: `Result` em vez de exceções

**Conceito:** hoje os erros de domínio são exceções e o `errorHandler` os mapeia. Uma alternativa é o caso de uso devolver `Result<Sucesso, Erro>`, de modo que o compilador obriga o adaptador a tratar cada caso.

**Atividade:** reescrever o `VerifyUser` devolvendo `{ ok: true, value } | { ok: false, error: 'NOT_FOUND' | 'INVALID_CODE' | 'ALREADY_VERIFIED' }` e comparar o adaptador HTTP antes e depois.

**Pergunta:** o que fica mais explícito e o que fica mais verboso? Erros inesperados (banco fora do ar) também devem virar `Result`?

---

## 13. Composition root que cresce: injeção manual × container de DI

**Conceito:** o `index.ts` da Aula 08 tem 6 instâncias; o da Aula 06 tem bem mais. Em algum ponto surge a vontade de usar um container (`awilix`, `tsyringe`, `inversify`).

**Atividade:** fazer a mesma composition root com um container e comparar legibilidade, rastreabilidade ("quem cria o `EmailSender`?") e erros em tempo de compilação × execução. Uma alternativa intermediária: uma composition root por módulo (`createUsersModule(deps)`).

**Pergunta:** o container é um adaptador? Ele pode "vazar" para dentro do hexágono (decorators como `@injectable()` nas classes do domínio)?

---

## 14. Quando **não** usar: o mesmo requisito em duas versões

**Conceito:** custo da abstração excessiva (um dos conteúdos da Aula 06).

**Atividade:** implementar um requisito pequeno (ex.: "endpoint que devolve a versão da API e o horário do servidor") de duas formas: com domínio/porta/caso de uso e em 10 linhas de rota. A turma vota qual faz sentido e justifica com os "sinais de over-engineering" do material da Aula 06.

**Pergunta:** que mudança futura de requisito faria a versão hexagonal valer a pena?

---

## Trilha sugerida

| Ordem | Ideias | Por quê |
| ----- | ------ | ------- |
| 1 | 1 (Clock) + 2 (Value Objects) | Pequenas, só mexem no núcleo e fecham a discussão da Aula 09. |
| 2 | 3 (Decorators) + 4 (adaptadores primários) | Mostram o ganho da arquitetura sem tocar no núcleo; usam o SMS instável da Aula 07. |
| 3 | 11 (testes de arquitetura e de contrato) | Antes de entrar Prisma no `cadastro`, garantir que o fake e o real se comportam igual. |
| 4 | 6 (transações) → 5 (eventos) → 7 (outbox) | Sequência natural que desemboca na aula de mensageria. |
| 5 | 8 (API externa) e 9 (auth) | Bons temas para trabalho em grupo. |
| Extra | 10 (já iniciada na Aula 09), 12, 13, 14 | Discussões de *trade-off*; funcionam bem como debate ou seminário. |

## Mini-projeto integrador (proposta de trabalho)

Evoluir o `cadastro` da Aula 09 para um **cadastro de clientes com endereço** (o cenário da `DISCUSSAO.md` da Aula 08):

- [ ] `Email`, `ZipCode` e `VerificationCode` como Value Objects (ideia 2).
- [ ] Código com expiração usando `Clock` (ideia 1).
- [ ] Endereço preenchido pela ViaCEP, com resposta validada por Zod e cache (ideias 3 e 8).
- [ ] Persistência com Prisma, cliente + endereço na mesma transação (ideia 6).
- [ ] Evento `CustomerVerified` disparando e-mail de boas-vindas via outbox (ideias 5 e 7).
- [ ] Um adaptador primário além do HTTP: CLI ou worker (ideia 4).
- [ ] Testes de contrato dos repositórios e teste de arquitetura no `npm test` (ideia 11).
- [ ] README com diagrama do hexágono e um parágrafo por decisão de *trade-off*.
