# Trabalho IV

## DATA 02/12/2026

## Contexto

Este trabalho fecha a disciplina juntando, em um único fluxo pequeno, os conteúdos das três últimas aulas que ainda não foram cobrados em trabalho:

* **Zod** e a separação entre validação de formato e regra de negócio ([Aula 09](../Aula09/aula09.md)).
* **CQRS simples**, com portas de escrita e de leitura separadas ([`Aula09/cqrs.md`](../Aula09/cqrs.md)).
* **Redis** como armazenamento com tempo de vida e operações atômicas ([Aula 10](../Aula10/aula10.md)).

O ponto de partida é o projeto [`Aula09/cadastro/`](../Aula09/cadastro/). Ele já está em arquitetura hexagonal (Aulas 06 a 08) e já tem schemas Zod no adaptador HTTP ([`schemas.ts`](../Aula09/cadastro/src/adapters/http/schemas.ts)), commands e queries separados, e as portas `CodeGenerator` e `EmailSender` com adaptadores de console e Nodemailer.

A funcionalidade nova é um **login em duas etapas (2FA)**:

1. O usuário informa e-mail e senha. Se estiverem corretos, o sistema gera um código de 6 dígitos, guarda esse código no Redis por **60 segundos** e o envia por notificação.
2. O usuário informa o código. Se estiver correto e dentro do prazo, o sistema cria uma sessão e devolve um token de acesso.

## Objetivo

Implementar o login em duas etapas sem quebrar a arquitetura existente: domínio e casos de uso continuam sem importar `express`, `zod` nem o cliente do Redis, e todo o fluxo continua testável sem Redis, sem rede e sem relógio real. Ao final, o aluno deve saber explicar por que o código de verificação mora no Redis e não em uma tabela, por que o consumo do código precisa ser atômico, e onde termina a validação de formato (Zod) e começa a regra de negócio (domínio).

## Conteúdos trabalhados

* Hash de senha com bcrypt e prevenção de *user enumeration* (retomada da [Aula 05](../Aula05/aula05.md)).
* Validação de requests, query string e `.env` com Zod no adaptador primário, com o contrato definido pelo núcleo.
* Formato × regra de negócio: as duas validações continuam existindo, em lugares diferentes.
* CQRS simples: commands passam pelo domínio; queries devolvem DTOs prontos por uma porta própria.
* Redis com TTL (`SET ... EX`), consumo atômico (`GETDEL`) e contadores (`INCR`).
* Condição de corrida: duas verificações simultâneas do mesmo código.
* Portas de saída para dependências que atrapalham testes: tempo, aleatoriedade e armazenamento externo.

## Preparando o ambiente

```bash
cd Aula09/cadastro
cp .env.example .env
npm install
npm test               # a suíte existente deve passar no estado inicial
npm run dev            # http://localhost:3009
```

Para o Redis, copiem o [`docker-compose.yml`](../Aula10/pedidos-com-redis/docker-compose.yml) da Aula 10 para dentro do projeto:

```bash
docker compose up -d                          # Redis em localhost:6379
docker compose exec redis redis-cli monitor   # acompanha cada comando enviado pela API
docker compose exec redis redis-cli           # KEYS *, GET 2fa:..., TTL 2fa:...
```

Usem o mesmo cliente da Aula 10 (pacote `redis`). Trabalhem em uma cópia (ou branch) do projeto: a suíte de testes existente (`test/cadastro.test.ts`, `test/schemas.test.ts`) deve continuar passando ao final.

## Discussão obrigatória (antes de codar)

Registrem as respostas do grupo em um parágrafo curto no README do projeto:

1. Por que guardar o código de verificação no Redis, e não em uma coluna da tabela de usuários? O que o TTL faz por vocês que o banco não faria sozinho?
2. Por que consumir o código com `GETDEL` e não com um `GET` seguido de um `DEL`? Descrevam o que aconteceria com duas requisições de verificação chegando ao mesmo tempo (é o mesmo raciocínio do lock da Aula 10).
3. Por que a segunda etapa recebe um `challengeId` e não o e-mail do usuário? E por que a primeira etapa deve responder da mesma forma para "e-mail não existe" e "senha errada"?
4. Se o Redis cair, o login deve **falhar fechado** (ninguém entra) ou **falhar aberto** (entra sem o segundo fator)? Comparem com o exercício 2 da Aula 10, em que o cache passava a ir direto ao banco.
5. "O código tem 6 dígitos numéricos" é formato (Zod) ou regra de negócio (domínio)? E "o código expira em 60 segundos"? E "no máximo 5 tentativas"?
6. Na Aula 10, o cache **não** era uma porta, mas o lock era. O armazenamento do desafio de 2FA deve ser uma porta? Por quê?

## Atividades obrigatórias

Implementar, na ordem 1 → 6 (elas dependem umas das outras):

1. **Senha no cadastro**
   * `POST /users` passa a receber `password`, validado no schema Zod (tamanho mínimo à escolha do grupo, justificado).
   * A senha é guardada como hash bcrypt. O hash fica atrás de uma porta (ex.: `PasswordHasher`), para que os casos de uso não importem `bcryptjs`.
   * A senha nunca aparece em resposta, log ou query.

2. **Primeira etapa do login: `POST /auth/login`**
   * Corpo `{ email, password }`, validado por Zod.
   * Só usuários **verificados** (fluxo já existente da Aula 08/09) podem fazer login.
   * Com credenciais corretas: gerar um código de 6 dígitos (porta `CodeGenerator`, já existente), gerar um `challengeId` aleatório, guardar o desafio no Redis com **TTL de 60 segundos** e enviar o código pela porta de notificação.
   * Resposta `200 { challengeId, expiresIn: 60 }`. Com credenciais erradas: `401` com a **mesma mensagem** para e-mail inexistente e senha errada.
   * A porta de notificação fala a língua do negócio (ex.: `sendLoginCode(user, code)`). Os adaptadores de console e Nodemailer existentes devem continuar funcionando, escolhidos pelo `.env`.

3. **Segunda etapa do login: `POST /auth/2fa/verify`**
   * Corpo `{ challengeId, code }`, com `code` validado pelo Zod como 6 dígitos.
   * O código é de **uso único**: ao acertar, o desafio é consumido atomicamente (`GETDEL` no adaptador Redis).
   * **No máximo 5 tentativas erradas** por desafio (contador com `INCR` no Redis, com o mesmo TTL do desafio). Na 6ª tentativa, o desafio é invalidado e a resposta é `429`.
   * Desafio inexistente, expirado ou já usado: `401` (o cliente não precisa saber qual dos três).
   * Ao acertar: criar uma sessão no Redis (`session:<token>`, TTL de 30 minutos) e responder `200 { token, expiresIn }`.

4. **Rota protegida: `GET /me`**
   * Lê `Authorization: Bearer <token>` e busca a sessão no Redis.
   * Sem token, com token inválido ou com sessão expirada: `401`. Com token válido: `200 { name, email }`.
   * É uma **query**: devolve um DTO e não passa pelo domínio.

5. **Histórico de tentativas (lado da leitura do CQRS): `GET /auth/attempts?email=&status=&page=&pageSize=`**
   * Cada tentativa das etapas 1 e 3 gera um registro (`email`, `status`, `occurredAt`). Os `status` possíveis são definidos pelo grupo, por exemplo `INVALID_CREDENTIALS`, `CODE_SENT`, `INVALID_CODE`, `EXPIRED`, `BLOCKED`, `SUCCESS`.
   * A gravação acontece nos commands; a leitura acontece por uma **porta de leitura própria** (ex.: `LoginAttemptQueries`), no mesmo estilo de `UserQueries`.
   * Query string validada por Zod (`status` como enum, `page`/`pageSize` com coerção e limites), resposta paginada no formato `Page<T>` já existente.
   * O histórico pode ficar no `InMemoryDatabase` já existente: não é preciso Prisma neste trabalho.

6. **Configuração validada**
   * As variáveis novas (`REDIS_URL`, `TWO_FACTOR_TTL_SECONDS`, `SESSION_TTL_SECONDS`, `MAX_CODE_ATTEMPTS`) são lidas e validadas com Zod em `config.ts`, como já é feito na Aula 09. Com `.env` inválido, a aplicação não sobe e a mensagem diz qual variável está errada.

## Critérios de avaliação

* **Testes passam:** `npm test` sem falhas, incluindo a suíte existente da Aula 09.
* **Testável sem infraestrutura:** os casos de uso são testados com adaptadores em memória para o desafio e a sessão, um gerador de código fixo e um **relógio falso** (porta `Clock`). Os testes não dependem de Redis rodando, de rede nem de esperar 60 segundos de verdade.
* **Testes obrigatórios** (no mínimo):
  * login com credenciais corretas envia o código e devolve `challengeId`;
  * credenciais erradas e e-mail inexistente devolvem a mesma resposta;
  * código correto dentro do prazo devolve token, e `GET /me` funciona com ele;
  * código usado depois de 60 segundos é rejeitado (com relógio falso);
  * o mesmo código não funciona duas vezes;
  * a 6ª tentativa errada é bloqueada;
  * entradas com formato inválido (código com letras, e-mail inválido, `pageSize` fora do limite) devolvem `400` pelo Zod, sem chegar ao caso de uso.
* **Concorrência demonstrada:** um teste (ou script em `scripts/`) dispara duas verificações simultâneas (`Promise.all`) do mesmo código contra o adaptador Redis real e mostra que só uma recebe token.
* **Domínio isolado:** domínio e casos de uso não importam `express`, `zod`, `redis` nem `bcryptjs`.
* **CQRS respeitado:** o histórico é lido por uma porta de leitura separada; nenhum command devolve listas e nenhuma query altera estado.
* **Segurança básica:** código e senha nunca aparecem em respostas HTTP nem no histórico; nenhum erro interno (stack trace, mensagem do Redis) chega ao cliente.
* **Composition root único:** um só lugar instancia o cliente do Redis e conecta os adaptadores, e é o único que lê `process.env`.
* **Registro de decisões:** respostas da discussão obrigatória e um diagrama de sequência (pode ser Mermaid, como em [`Aula06/diagramas-sequencia.md`](../Aula06/diagramas-sequencia.md)) do fluxo completo de login no README do projeto.

## Entrega

Repositório (ou cópia do projeto `cadastro/`) contendo a implementação das atividades obrigatórias, o `docker-compose.yml` do Redis, a suíte de testes atualizada e o registro das decisões solicitadas.

Gravação da explicação (até 10 minutos) do projeto, cobrindo:
- Demonstração do fluxo completo: cadastro → verificação → login → código → `GET /me`, com o `redis-cli monitor` aberto mostrando as chaves sendo criadas e consumidas.
- Demonstração de um código expirando e de um código reutilizado sendo rejeitado.
- Onde está cada validação (Zod × domínio) e por quê.
- Quais portas foram criadas, quais são de escrita e quais são de leitura.
- O teste de concorrência e o que garante que só uma verificação vence.
- Decisões técnicas (e, se feita, a integração com o serviço de notificações).
