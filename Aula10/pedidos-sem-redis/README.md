# Aula 10 — Pedidos SEM Redis (versão 1)

Uma API de pedidos bem simples: uma vitrine de produtos com estoque e uma rota para comprar. Ela segue a mesma organização hexagonal + CQRS da [Aula 09](../../Aula09/cadastro/).

Esta versão tem **dois problemas de propósito**, que a [versão com Redis](../pedidos-com-redis/) resolve:

1. **Toda listagem vai ao banco.** `GET /products` é a rota mais chamada e a mais cara (300 ms), e repete a mesma consulta mesmo quando nada mudou.
2. **Pedidos simultâneos vendem mais do que o estoque.** A camiseta tem 5 unidades; 20 pedidos ao mesmo tempo são **todos** aceitos e o estoque termina em 4.

Material da aula: [`../aula10.md`](../aula10.md).

## Como rodar

```bash
cd Aula10/pedidos-sem-redis
npm install
npm run dev        # http://localhost:3010
npm test           # ⚠️ o teste de concorrência FALHA de propósito
```

Com a API rodando, em outro terminal:

```bash
npm run ataque     # 20 pedidos simultâneos da camiseta
npm run listagem   # 20 listagens seguidas, contando as idas ao banco
```

As requisições de exemplo estão em [`test.http`](test.http).

## A API

| Método | Rota             | Corpo                       | Respostas |
| ------ | ---------------- | --------------------------- | --------- |
| GET    | `/products`      |                             | 200 `[{ id, name, priceCents, stock }]` |
| POST   | `/orders`        | `{ productId, quantity }`   | 201 · 400 (Zod) · 404 produto · 409 estoque insuficiente |
| GET    | `/orders`        |                             | 200 `[{ id, productId, quantity, totalCents, createdAt }]` |
| GET    | `/debug/stats`   |                             | 200 `{ dbQueries }` (só para a aula) |
| POST   | `/debug/reset`   |                             | 204 volta ao estoque inicial (só para a aula) |

Produtos iniciais: `camiseta` (5 unidades), `caneca` (50) e `adesivo` (1000).

## O mapa do projeto

```
src/
├── domain/                     Product.reserve() = a regra do estoque (está CERTA)
├── application/
│   ├── commands/PlaceOrder.ts  ← os 5 passos do pedido (e a condição de corrida)
│   ├── queries/                ListProducts, ListOrders
│   └── ports/                  ProductRepository, OrderRepository, ProductQueries,
│                               OrderQueries, PaymentGateway
├── adapters/
│   ├── memory/SlowDatabase.ts  ← "banco" com latência, cópias e contador de consultas
│   ├── payment/                pagamento falso (100 ms)
│   └── http/                   rotas, Zod, errorHandler e rotas de debug
├── app.ts                      ← COMPOSITION ROOT (usado também pelos testes)
└── index.ts                    sobe o servidor
```

## O que observar

- [`PlaceOrder.ts`](src/application/commands/PlaceOrder.ts): conte os `await` entre ler o produto e gravar o produto. Cada um é uma chance para outra requisição entrar.
- [`SlowDatabase.ts`](src/adapters/memory/SlowDatabase.ts): cada leitura devolve uma **cópia** da linha, como um banco de verdade. Com `npm run dev`, cada consulta aparece no terminal com um número.
- [`test/concorrencia.test.ts`](test/concorrencia.test.ts): o teste descreve o comportamento correto (5 aceitos, 15 recusados, estoque 0) e falha mostrando o que aconteceu:

```
  + actual - expected
    {
  +   estoqueFinal: 4,
  +   pedidosAceitos: 20,
  +   pedidosGravadosNoBanco: 20,
  +   pedidosRecusados: 0
  -   estoqueFinal: 0,
  -   pedidosAceitos: 5,
  -   pedidosGravadosNoBanco: 5,
  -   pedidosRecusados: 15
    }
```
