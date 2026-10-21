# Aula 10 — Pedidos COM Redis (versão 2)

É o mesmo projeto da [versão sem Redis](../pedidos-sem-redis/), com duas mudanças:

1. **Cache na listagem.** `GET /products` passa pelo Redis: só a primeira chamada vai ao banco; as outras saem do cache até alguém comprar (invalidação) ou até passar 60 s (TTL).
2. **Lock distribuído no pedido.** `POST /orders` executa os 5 passos (ler, reservar, cobrar, gravar estoque, gravar pedido) dentro de um lock `lock:product:<id>` no Redis. Pedidos do mesmo produto entram um por vez.

Material da aula: [`../aula10.md`](../aula10.md). Detalhes da estratégia de lock: [`LOCK.md`](LOCK.md).

## Como rodar

```bash
cd Aula10/pedidos-com-redis
docker compose up -d   # Redis em localhost:6379
npm install
npm run dev            # http://localhost:3010
npm test               # agora o teste de concorrência PASSA
```

Com a API rodando, em outro terminal:

```bash
npm run ataque         # 20 pedidos simultâneos da camiseta: 5 aceitos, 15 recusados
npm run listagem       # 20 listagens: 1 consulta ao banco, 19 do cache
docker compose exec redis redis-cli monitor   # cada comando que a API manda ao Redis
```

| Variável | Padrão | Uso |
| -------- | ------ | --- |
| `PORT` | `3010` | Porta da API |
| `REDIS_URL` | `redis://localhost:6379` | Redis da aplicação (banco 0) |
| `TEST_REDIS_URL` | `redis://localhost:6379/15` | Redis dos testes (banco 15, apagado a cada teste) |

A API é a mesma da versão 1; `GET /debug/stats` agora também devolve `cacheHits` e `cacheMisses`, e `POST /debug/reset` também apaga o cache.

## Por que uma transação do banco não basta?

A pergunta natural é: "por que não abrir uma transação (`BEGIN ... COMMIT`) em volta dos 5 passos e pronto?". Três motivos.

### 1. Transação não é lock

Uma transação garante que as gravações dela entram **todas ou nenhuma** (atomicidade). Ela **não** garante, sozinha, que duas transações não leiam o mesmo valor ao mesmo tempo. No nível de isolamento padrão da maioria dos bancos (*READ COMMITTED* no PostgreSQL, SQL Server e Oracle), o *lost update* acontece mesmo com transação:

```mermaid
sequenceDiagram
  participant A as Transação A
  participant B as Transação B
  participant DB as Banco
  A->>DB: BEGIN; SELECT stock (camiseta)
  B->>DB: BEGIN; SELECT stock (camiseta)
  DB-->>A: stock = 5
  DB-->>B: stock = 5
  A->>DB: UPDATE stock = 4; COMMIT
  B->>DB: UPDATE stock = 4; COMMIT
  Note over DB: duas transações válidas, duas vendas, estoque caiu só 1
```

As duas transações estão corretas do ponto de vista do banco: cada uma leu um valor confirmado e gravou o seu. O defeito está no *read-modify-write* feito na aplicação, que o banco não enxerga.

Para o banco segurar isso, é preciso pedir explicitamente: `SELECT ... FOR UPDATE` (trava a linha até o `COMMIT`) ou isolamento `SERIALIZABLE` (o banco aborta uma das transações). Ou seja, o que resolve é um **lock**, não a transação.

### 2. A transação não alcança o que está fora do banco

Mesmo com `FOR UPDATE`, o passo 3 (cobrar no meio de pagamento) é uma chamada HTTP para outro sistema. O banco não tem como desfazê-la:

- **Rollback não devolve o dinheiro.** Se a cobrança passa e o `COMMIT` falha (queda de conexão, *deadlock*, timeout), o cliente foi cobrado e o pedido não existe.
- **`SERIALIZABLE` piora.** O banco aborta a transação "perdedora" *depois* que ela já cobrou; a aplicação refaz a transação e cobra de novo.
- **Lock de linha segurado durante uma chamada externa é caro.** Enquanto o pagamento responde (centenas de ms, às vezes segundos), a transação fica aberta, a linha fica travada e uma conexão do *pool* fica presa. Com tráfego, o *pool* esgota e a API inteira para, não só a camiseta.

A transação protege **dados de um banco**. A operação aqui é **um fluxo** que envolve banco + pagamento (e poderia envolver e-mail, fila, outro serviço).

### 3. Os dados podem nem estar no mesmo banco

`ProductRepository` e `OrderRepository` são portas separadas. Nada garante que os dois adaptadores apontem para o mesmo banco (neste projeto são até em memória, sem transação nenhuma). Uma transação só vale dentro de **uma** conexão com **um** banco; o lock no Redis vale para qualquer combinação de adaptadores, porque coordena **quem executa o caso de uso**, e não onde os dados moram.

### Então nunca usar transação?

Usar, mas para o que ela faz bem:

| Situação | Ferramenta |
| -------- | ---------- |
| Só decrementar estoque, tudo no banco | `UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?` (atômico, sem lock na aplicação) |
| Vários `UPDATE`/`INSERT` no mesmo banco que precisam entrar juntos (passos 4 e 5) | Transação |
| Fluxo com passos fora do banco que não podem ser intercalados (passos 1 a 5) | Lock distribuído (Redis) |

Num sistema real, os dois convivem: o lock garante que só um pedido da camiseta roda o fluxo por vez, e a transação garante que o estoque e o pedido são gravados juntos no final.

Mais contexto em [`../aula10.md`](../aula10.md#e-uma-transação-do-banco).

## O que mudou em relação à versão 1

```bash
git diff --no-index ../pedidos-sem-redis/src src
```

| Arquivo | Mudança |
| ------- | ------- |
| [`src/application/ports/Lock.ts`](src/application/ports/Lock.ts) | **Novo.** Porta `withLock(key, fn)` e `LockTimeoutError`. |
| [`src/application/commands/PlaceOrder.ts`](src/application/commands/PlaceOrder.ts) | Os 5 passos agora rodam dentro de `lock.withLock('lock:product:<id>', ...)`. |
| [`src/adapters/redis/RedisLock.ts`](src/adapters/redis/RedisLock.ts) | **Novo.** `SET key token NX PX 5000` para adquirir, script Lua para liberar só o próprio lock. |
| [`src/adapters/redis/RedisCachedProductQueries.ts`](src/adapters/redis/RedisCachedProductQueries.ts) | **Novo.** Decorator da porta `ProductQueries`: cache-aside com TTL. |
| [`src/adapters/redis/CacheInvalidatingProductRepository.ts`](src/adapters/redis/CacheInvalidatingProductRepository.ts) | **Novo.** Decorator do `ProductRepository`: apaga o cache ao gravar um produto. |
| [`src/adapters/redis/redisClient.ts`](src/adapters/redis/redisClient.ts) | **Novo.** Cria e conecta o cliente (`redis` / node-redis). |
| [`src/app.ts`](src/app.ts) | Composition root: embrulha os adaptadores antigos e entrega o `RedisLock` ao `PlaceOrder`. |
| [`src/adapters/http/errorHandler.ts`](src/adapters/http/errorHandler.ts) | `LockTimeoutError` → 503. |
| [`test/helpers.ts`](test/helpers.ts) | Conecta no Redis de testes e o limpa antes de cada teste. |
| [`test/concorrencia.test.ts`](test/concorrencia.test.ts) | **Igual** à versão 1 (só o comentário mudou), e agora passa. |
| [`test/listagem.test.ts`](test/listagem.test.ts) | 20 listagens = 1 consulta; depois de um pedido a listagem mostra o estoque novo. |
| `src/domain/`, queries, rotas | **Nada.** |

## O mapa do projeto

```
src/
├── domain/                     igual à versão 1
├── application/
│   ├── commands/PlaceOrder.ts  ← usa a porta Lock
│   ├── queries/                igual à versão 1
│   └── ports/Lock.ts           ← NOVO
├── adapters/
│   ├── redis/                  ← NOVO: RedisLock, RedisCachedProductQueries,
│   │                                   CacheInvalidatingProductRepository, redisClient
│   ├── memory/  payment/       iguais à versão 1
│   └── http/                   + LockTimeoutError -> 503, stats do cache
├── app.ts                      ← liga o Redis (composition root)
└── index.ts                    conecta no Redis e sobe o servidor
docker-compose.yml              ← Redis 7.4
```
